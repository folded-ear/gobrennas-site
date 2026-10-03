import {
  PlanItemStatus,
  type RecognitionChoice,
} from "@/__generated__/graphql";
import { ApolloCache } from "@apollo/client";
import {
  PlanItemChangeStateFragment,
  PlanItemChangeStateFragmentDoc,
} from "./__generated__/planItemChangeState.generated";
import { evictItem } from "./evict";
import { insertCreated } from "./insert";

/** An item that exists, or one waiting on its create. */
export type ItemKey = { readonly id: string } | { readonly draftId: string };

/** One item's status change, and the plan it belongs to. */
export type StatusChange = {
  readonly kind: "status";
  readonly id: string;
  readonly planId: string;
  readonly name: string;
  readonly status: PlanItemStatus;
};

/** One item's new name. */
export type RenameChange = {
  readonly kind: "rename";
  readonly id: string;
  readonly planId: string;
  readonly name: string;
};

/** A new item, created under its parent after another item, or first. */
export type CreateChange = {
  readonly kind: "create";
  readonly draftId: string;
  readonly planId: string;
  readonly parentId: string;
  readonly afterId: ItemKey | null;
  readonly name: string;
  readonly choice?: RecognitionChoice;
  /** Assigned once created; left out, the item only inherits one. */
  readonly bucketId?: string | null;
};

/** One item's bucket, set or cleared. */
export type AssignBucketChange = {
  readonly kind: "assignBucket";
  readonly id: string;
  readonly planId: string;
  readonly name: string;
  readonly bucketId: string | null;
};

export type PlanChange =
  StatusChange | RenameChange | CreateChange | AssignBucketChange;

/** A create as it is sent: its place named by a real id. */
export type SentCreate = Omit<CreateChange, "afterId" | "bucketId"> & {
  readonly afterId: string | null;
};

/** A change as it is sent, naming only items that exist. */
export type SentChange = Exclude<PlanChange, CreateChange> | SentCreate;

/** A change's item id once saved, or null when it wasn't. */
export type ChangeOutcome = string | null;

export type SendOptions = {
  /** Whether the request must outlive the page. */
  readonly keepalive: boolean;
};

/** I send changes as one request, giving each change's outcome. */
export type ChangeSender = (
  changes: readonly SentChange[],
  options: SendOptions,
) => Promise<readonly ChangeOutcome[]>;

export type ChangeQueueOptions = {
  readonly cache: ApolloCache;
  readonly send: ChangeSender;
  /** How long a COMPLETED or DELETED change waits before it is sent. */
  readonly delayMs: number;
  readonly onFailure: (failed: readonly PlanChange[]) => void;
};

export type PlanChangeQueue = {
  /** I send status changes as soon as their plan is free. */
  set(changes: readonly StatusChange[]): void;
  /** I hold a COMPLETED or DELETED change for a while, then send it. */
  hold(change: StatusChange): void;
  /** I drop a held change that has yet to be sent. */
  cancel(id: string): void;
  /** I send every held change now, in requests that outlive the page. */
  flush(): void;
  /** I send a new name as soon as its plan is free. */
  rename(change: RenameChange): void;
  /**
   * I create an item as soon as its plan is free, and whatever it's placed
   * after has been created. I resolve with its id once it and any bucket
   * it carries have been sent, or null if it couldn't be created.
   */
  create(change: CreateChange): Promise<string | null>;
};

type PlanLine = {
  ready: PlanChange[];
  inFlight: boolean;
  /** Whether the next request must outlive the page. */
  keepalive: boolean;
};

type Held = {
  readonly change: StatusChange;
  readonly timer: ReturnType<typeof setTimeout>;
};

/** A create's caller, waiting on it and on any bucket after it. */
type Waiting = (id: string | null) => void;

const REMOVALS: ReadonlySet<PlanItemStatus> = new Set([
  PlanItemStatus.COMPLETED,
  PlanItemStatus.DELETED,
]);

/**
 * I send plan changes one request at a time per plan, holding removals
 * for a window in which they can be cancelled. A create ends its request,
 * so anything placed after it is sent once its id is known. What I'm
 * doing to an item shows in its local change state.
 */
export function createChangeQueue({
  cache,
  send,
  delayMs,
  onFailure,
}: ChangeQueueOptions): PlanChangeQueue {
  const lines = new Map<string, PlanLine>();
  const held = new Map<string, Held>();
  /** Each created draft's real id, or null when its create failed. */
  const drafts = new Map<string, string | null>();
  const waiting = new Map<string, Waiting>();
  /** The draft a created item's bucket change finishes. */
  const bucketFor = new Map<string, string>();

  function writeState(id: string, state: Partial<PlanItemChangeStateFragment>) {
    const cacheId = cache.identify({ __typename: "PlanItem", id });
    const current = cache.readFragment({
      fragment: PlanItemChangeStateFragmentDoc,
      id: cacheId,
    });
    // An item already gone from the cache has nothing to show.
    if (current === null) return;
    cache.writeFragment({
      fragment: PlanItemChangeStateFragmentDoc,
      id: cacheId,
      data: { ...current, ...state },
    });
  }

  function lineFor(planId: string): PlanLine {
    let line = lines.get(planId);
    if (line === undefined) {
      line = { ready: [], inFlight: false, keepalive: false };
      lines.set(planId, line);
    }
    return line;
  }

  function enqueue(change: PlanChange, keepalive = false) {
    const line = lineFor(change.planId);
    if (change.kind === "status") {
      writeState(change.id, { savingStatus: true });
    } else if (change.kind === "rename") {
      writeState(change.id, { pendingName: change.name });
      const at = line.ready.findIndex(
        (it) => it.kind === "rename" && it.id === change.id,
      );
      if (at >= 0) {
        line.ready[at] = change;
        return;
      }
    }
    line.ready.push(change);
    line.keepalive ||= keepalive;
  }

  function finish(draftId: string, id: string | null) {
    const resolve = waiting.get(draftId);
    waiting.delete(draftId);
    resolve?.(id);
  }

  /** I name a key's item by its real id, or null if it never existed. */
  function resolveKey(key: ItemKey): string | null {
    return "id" in key ? key.id : (drafts.get(key.draftId) ?? null);
  }

  /** I give the change to send, or null when what it names failed. */
  function toSent(change: PlanChange): SentChange | null {
    if (change.kind !== "create") return change;
    const afterId = change.afterId === null ? null : resolveKey(change.afterId);
    if (change.afterId !== null && afterId === null) return null;
    return {
      kind: "create",
      draftId: change.draftId,
      planId: change.planId,
      parentId: change.parentId,
      afterId,
      name: change.name,
      ...(change.choice ? { choice: change.choice } : {}),
    };
  }

  function settle(
    change: PlanChange,
    sent: SentChange | null,
    id: ChangeOutcome,
  ) {
    const saved = id !== null;
    switch (change.kind) {
      case "status":
        if (saved && REMOVALS.has(change.status)) {
          evictItem(cache, change.id);
        } else if (saved) {
          writeState(change.id, { savingStatus: false });
        } else {
          writeState(change.id, { pendingStatus: null, savingStatus: false });
        }
        return;
      case "rename":
        writeState(change.id, { pendingName: null });
        return;
      case "assignBucket": {
        const draftId = bucketFor.get(change.id);
        bucketFor.delete(change.id);
        if (draftId !== undefined) finish(draftId, change.id);
        return;
      }
      case "create": {
        drafts.set(change.draftId, id);
        if (id === null) {
          finish(change.draftId, null);
          return;
        }
        insertCreated(cache, {
          id,
          parentId: change.parentId,
          afterId: sent?.kind === "create" ? sent.afterId : null,
          planId: change.planId,
        });
        if (change.bucketId === undefined) {
          finish(change.draftId, id);
          return;
        }
        bucketFor.set(id, change.draftId);
        lineFor(change.planId).ready.unshift({
          kind: "assignBucket",
          id,
          planId: change.planId,
          name: change.name,
          bucketId: change.bucketId,
        });
      }
    }
  }

  /** I take a line's next batch: up to and including its first create. */
  function takeBatch(line: PlanLine): PlanChange[] {
    const end = line.ready.findIndex((it) => it.kind === "create");
    const count = end < 0 ? line.ready.length : end + 1;
    return line.ready.splice(0, count);
  }

  function drain(line: PlanLine) {
    if (line.inFlight || line.ready.length === 0) return;
    const batch = takeBatch(line);
    const failed: PlanChange[] = [];
    const changes: PlanChange[] = [];
    const sents: SentChange[] = [];
    for (const change of batch) {
      const sent = toSent(change);
      if (sent === null) {
        failed.push(change);
        settle(change, null, null);
      } else {
        changes.push(change);
        sents.push(sent);
      }
    }
    if (failed.length > 0) onFailure(failed);
    if (changes.length === 0) {
      drain(line);
      return;
    }
    const options = { keepalive: line.keepalive };
    line.keepalive = false;
    line.inFlight = true;
    void send(sents, options)
      .catch(() => changes.map(() => null))
      .then((outcomes) => {
        changes.forEach((change, i) =>
          settle(change, sents[i], outcomes[i] ?? null),
        );
        const unsaved = changes.filter(
          (_, i) => (outcomes[i] ?? null) === null,
        );
        if (unsaved.length > 0) onFailure(unsaved);
      })
      .finally(() => {
        line.inFlight = false;
        drain(line);
      });
  }

  function release(id: string, keepalive: boolean) {
    const entry = held.get(id);
    if (entry === undefined) return;
    held.delete(id);
    clearTimeout(entry.timer);
    enqueue(entry.change, keepalive);
    drain(lineFor(entry.change.planId));
  }

  return {
    set(changes) {
      for (const change of changes) enqueue(change);
      for (const planId of new Set(changes.map((it) => it.planId))) {
        drain(lineFor(planId));
      }
    },
    hold(change) {
      writeState(change.id, { pendingStatus: change.status });
      held.set(change.id, {
        change,
        timer: setTimeout(() => release(change.id, false), delayMs),
      });
    },
    cancel(id) {
      const entry = held.get(id);
      if (entry === undefined) return;
      held.delete(id);
      clearTimeout(entry.timer);
      writeState(id, { pendingStatus: null });
    },
    flush() {
      for (const id of [...held.keys()]) release(id, true);
    },
    rename(change) {
      enqueue(change);
      drain(lineFor(change.planId));
    },
    create(change) {
      const created = new Promise<string | null>((resolve) =>
        waiting.set(change.draftId, resolve),
      );
      enqueue(change);
      drain(lineFor(change.planId));
      return created;
    },
  };
}
