import { PlanItemStatus } from "@/__generated__/graphql";
import { ApolloCache } from "@apollo/client";
import {
  PlanItemStatusStateFragment,
  PlanItemStatusStateFragmentDoc,
} from "./__generated__/planItemStatusState.generated";
import { evictItem } from "./evict";

/** One item's status change, and the plan it belongs to. */
export type StatusChange = {
  readonly id: string;
  readonly planId: string;
  readonly name: string;
  readonly status: PlanItemStatus;
};

export type SendOptions = {
  /** Whether the request must outlive the page. */
  readonly keepalive: boolean;
};

/** I send changes as one request, saying per change whether it saved. */
export type StatusSender = (
  changes: readonly StatusChange[],
  options: SendOptions,
) => Promise<readonly boolean[]>;

export type StatusQueueOptions = {
  readonly cache: ApolloCache;
  readonly send: StatusSender;
  /** How long a COMPLETED or DELETED change waits before it is sent. */
  readonly delayMs: number;
  readonly onFailure: (failed: readonly StatusChange[]) => void;
};

export type StatusQueue = {
  /** I send NEEDED or ACQUIRED changes as soon as their plan is free. */
  set(changes: readonly StatusChange[]): void;
  /** I hold a COMPLETED or DELETED change for a while, then send it. */
  hold(change: StatusChange): void;
  /** I drop a held change that has yet to be sent. */
  cancel(id: string): void;
  /** I send every held change now, in requests that outlive the page. */
  flush(): void;
};

type PlanLine = {
  ready: StatusChange[];
  inFlight: boolean;
  /** Whether the next request must outlive the page. */
  keepalive: boolean;
};

type Held = {
  readonly change: StatusChange;
  readonly timer: ReturnType<typeof setTimeout>;
};

const REMOVALS: ReadonlySet<PlanItemStatus> = new Set([
  PlanItemStatus.COMPLETED,
  PlanItemStatus.DELETED,
]);

/**
 * I send status changes one request at a time per plan, holding removals
 * for a window in which they can be cancelled. What I'm doing to an item
 * shows in its local status state.
 */
export function createStatusQueue({
  cache,
  send,
  delayMs,
  onFailure,
}: StatusQueueOptions): StatusQueue {
  const lines = new Map<string, PlanLine>();
  const held = new Map<string, Held>();

  function writeState(id: string, state: Partial<PlanItemStatusStateFragment>) {
    const cacheId = cache.identify({ __typename: "PlanItem", id });
    const current = cache.readFragment({
      fragment: PlanItemStatusStateFragmentDoc,
      id: cacheId,
    });
    // An item already gone from the cache has nothing to show.
    if (current === null) return;
    cache.writeFragment({
      fragment: PlanItemStatusStateFragmentDoc,
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

  function enqueue(change: StatusChange, keepalive = false) {
    writeState(change.id, { savingStatus: true });
    const line = lineFor(change.planId);
    line.ready.push(change);
    line.keepalive ||= keepalive;
  }

  function settle(change: StatusChange, saved: boolean) {
    if (saved && REMOVALS.has(change.status)) {
      evictItem(cache, change.id);
    } else if (saved) {
      writeState(change.id, { savingStatus: false });
    } else {
      writeState(change.id, { pendingStatus: null, savingStatus: false });
    }
  }

  function drain(line: PlanLine) {
    if (line.inFlight || line.ready.length === 0) return;
    const changes = line.ready;
    const options = { keepalive: line.keepalive };
    line.ready = [];
    line.keepalive = false;
    line.inFlight = true;
    void send(changes, options)
      .catch(() => changes.map(() => false))
      .then((saved) => {
        changes.forEach((change, i) => settle(change, saved[i] ?? false));
        const failed = changes.filter((_, i) => !saved[i]);
        if (failed.length > 0) onFailure(failed);
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
  };
}
