import { PlanItemStatus } from "@/__generated__/graphql";
import { isDraftId, mapIds, namedIds } from "./ids";
import {
  AssignBucketChange,
  Change,
  ChangeRecord,
  Effect,
  Event,
  InFlight,
  Pending,
  POLL_INTERVAL_MS,
  POLL_MARGIN_MS,
  REQUEST_TIMEOUT_MS,
  RETRY_BASE_MS,
  RETRY_MAX_MS,
  SendOutcome,
  SentChange,
  State,
  UNDO_WINDOW_MS,
} from "./state";

export type StateInit = {
  readonly pageLoadId: string;
  readonly userId: string | null;
  readonly renderedAt: number;
  readonly online: boolean;
  readonly visible: boolean;
};

const REMOVALS: ReadonlySet<PlanItemStatus> = new Set([
  PlanItemStatus.COMPLETED,
  PlanItemStatus.DELETED,
]);

/** I give an engine's state before it has booted. */
export function initialState({
  pageLoadId,
  userId,
  renderedAt,
  online,
  visible,
}: StateInit): State {
  return {
    pageLoadId,
    userId,
    lifecycle: "booting",
    storing: userId !== null,
    online,
    visible,
    authorized: true,
    pending: [],
    lastKey: 0,
    lastSeq: 0,
    aliases: {},
    inFlight: null,
    lastRequestId: 0,
    failures: 0,
    retryAt: 0,
    keepalive: false,
    watched: {},
    cutoffs: {},
    renderedAt,
    pollDueAt: 0,
    installable: false,
    updateWaiting: false,
    seedWanted: false,
    snapshotting: userId !== null,
  };
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

type Work = Mutable<State> & { pending: Pending[] };

/** One step's working state and what it asks for. */
class Stepping {
  readonly w: Work;
  readonly effects: Effect[] = [];
  readonly failed: Change[] = [];
  /** What this step stores and forgets, as one write. */
  readonly puts: ChangeRecord[] = [];
  readonly removes: string[] = [];

  constructor(
    state: State,
    readonly at: number,
  ) {
    this.w = { ...state, pending: [...state.pending] };
  }

  emit(effect: Effect) {
    this.effects.push(effect);
  }

  record(entry: Pending): ChangeRecord {
    return {
      key: entry.key,
      userId: this.w.userId!,
      pageLoadId: this.w.pageLoadId,
      seq: entry.seq,
      change: entry.change,
      ...(entry.holdUntil === undefined ? {} : { holdUntil: entry.holdUntil }),
    };
  }

  /** I store entries, unless nothing is stored, and say they're storing. */
  keep(entries: readonly Pending[]): Pending[] {
    if (!this.w.storing || entries.length === 0) {
      return entries.map((it) => ({ ...it, kept: "unkept" }));
    }
    const storing = entries.map((it) => ({ ...it, kept: "storing" as const }));
    this.puts.push(...storing.map((it) => this.record(it)));
    return storing;
  }

  /**
   * I store entries again, already kept in an earlier form. They stay
   * sendable meanwhile, as either form is safe to send.
   */
  storeAgain(entries: readonly Pending[]) {
    if (!this.w.storing) return;
    this.puts.push(
      ...entries
        .filter((it) => it.kept !== "unkept")
        .map((it) => this.record(it)),
    );
  }

  forget(keys: readonly string[]) {
    if (this.w.storing) this.removes.push(...keys);
  }

  replace(entry: Pending) {
    const at = this.w.pending.findIndex((it) => it.key === entry.key);
    this.w.pending[at] = entry;
  }

  insert(entry: Pending) {
    const at = this.w.pending.findIndex((it) => it.seq > entry.seq);
    if (at < 0) this.w.pending.push(entry);
    else this.w.pending.splice(at, 0, entry);
  }

  nextSeq() {
    this.w.lastSeq = Math.max(this.at, this.w.lastSeq + 1);
    return this.w.lastSeq;
  }

  /**
   * I drop a change the server refused, or couldn't be sent, along with
   * every change waiting on a create among them.
   */
  refuse(entry: Pending) {
    // Already gone with a create it waited on.
    if (!this.w.pending.some((it) => it.key === entry.key)) return;
    this.w.pending = this.w.pending.filter((it) => it.key !== entry.key);
    this.forget([entry.key]);
    this.failed.push(entry.change);
    if (entry.change.kind !== "create") return;
    const draftId = entry.change.id;
    this.emit({ kind: "evictDraft", id: draftId });
    this.emit({ kind: "created", draftId, id: null });
    this.w.pending
      .filter(
        (it) =>
          it.phase !== "answered" && namedIds(it.change).includes(draftId),
      )
      .forEach((it) => this.refuse(it));
  }

  finish(): { state: State; effects: readonly Effect[] } {
    if (this.puts.length > 0 || this.removes.length > 0) {
      this.emit({ kind: "store", put: this.puts, remove: this.removes });
    }
    if (this.failed.length > 0) {
      this.emit({ kind: "toast", failed: this.failed });
    }
    return { state: this.w, effects: this.effects };
  }
}

/** I take one event, giving the next state and what to do about it. */
export function step(
  state: State,
  event: Event,
): { state: State; effects: readonly Effect[] } {
  const s = new Stepping(state, event.at);
  handle(s, event);
  releaseExpired(s);
  checkDeadline(s);
  dispatch(s);
  const result = s.finish();
  return samePending(result.state.pending, state.pending)
    ? { ...result, state: { ...result.state, pending: state.pending } }
    : result;
}

function samePending(a: readonly Pending[], b: readonly Pending[]) {
  return a.length === b.length && a.every((it, i) => it === b[i]);
}

function handle(s: Stepping, event: Event) {
  const { w, at } = s;
  switch (event.type) {
    case "boot":
      if (w.lifecycle !== "booting") return;
      for (const record of event.adopted) {
        s.insert({
          key: record.key,
          seq: record.seq,
          change: record.change,
          phase: "ready",
          kept: "kept",
        });
        w.lastSeq = Math.max(w.lastSeq, record.seq);
        if (record.change.kind === "create") {
          s.emit({ kind: "writeDraft", change: record.change });
        }
      }
      if (event.restored !== null) {
        w.renderedAt = event.restored.renderedAt;
        w.cutoffs = { ...event.restored.cutoffs, ...w.cutoffs };
      }
      if (w.snapshotting && !event.snapshotCurrent) {
        if (event.shoppingCached) {
          s.emit({ kind: "snapshot", takenAt: w.renderedAt });
        } else w.seedWanted = true;
      }
      w.lifecycle = "running";
      return;
    case "change":
      add(s, event.change, event.hold ?? false);
      return;
    case "changes": {
      const group = `${w.pageLoadId}-g${w.lastKey + 1}`;
      event.changes.forEach((it) => add(s, it, false, group));
      return;
    }
    case "cancel": {
      const held = w.pending.find(
        (it) =>
          it.phase === "held" &&
          it.change.kind === "status" &&
          it.change.id === event.id,
      );
      if (held === undefined) return;
      w.pending = w.pending.filter((it) => it !== held);
      s.forget([held.key]);
      return;
    }
    case "flush":
      releaseHeld(s);
      return;
    case "watch":
      for (const planId of event.planIds) {
        const count = w.watched[planId] ?? 0;
        if (count === 0) w.pollDueAt = Math.min(w.pollDueAt, at);
        w.watched = { ...w.watched, [planId]: count + 1 };
      }
      return;
    case "unwatch":
      for (const planId of event.planIds) {
        const { [planId]: count = 0, ...rest } = w.watched;
        w.watched = count > 1 ? { ...rest, [planId]: count - 1 } : rest;
      }
      return;
    case "online":
      w.online = true;
      reconnect(s);
      if (w.inFlight !== null && w.inFlight.abort === null) {
        w.inFlight = { ...w.inFlight, abort: "reconnect" };
        s.emit({ kind: "abort" });
      }
      return;
    case "offline":
      w.online = false;
      return;
    case "visible":
      w.visible = true;
      reconnect(s);
      return;
    case "hidden":
      w.visible = false;
      releaseHeld(s);
      return;
    case "tick":
      return;
    case "pagehide":
      if (!event.persisted || w.lifecycle !== "running") return;
      w.lifecycle = "frozen";
      s.emit({ kind: "freeze" });
      return;
    case "pageshow":
      if (!event.persisted || w.lifecycle !== "frozen") return;
      w.lifecycle = "restoring";
      s.emit({ kind: "thaw" });
      return;
    case "restored": {
      if (w.lifecycle !== "restoring") return;
      const mine = new Set(event.keys);
      const adopted = w.pending.filter(
        (it) => it.kept === "kept" && !mine.has(it.key),
      );
      w.pending = w.pending.filter((it) => !adopted.includes(it));
      for (const { change } of adopted) {
        if (change.kind === "create") {
          s.emit({ kind: "evictDraft", id: change.id });
        }
      }
      w.lifecycle = "running";
      return;
    }
    case "forget":
      w.snapshotting = false;
      w.seedWanted = false;
      return;
    case "seeded": {
      const flight = w.inFlight;
      if (flight?.kind !== "seed" || flight.id !== event.requestId) return;
      w.inFlight = null;
      switch (event.outcome.kind) {
        case "saved":
          w.seedWanted = false;
          if (w.snapshotting) {
            s.emit({ kind: "snapshot", takenAt: flight.startedAt });
          }
          return;
        case "refused":
          w.seedWanted = false;
          return;
        case "unreachable":
          if (flight.abort !== "reconnect") backOff(s);
          return;
        case "unauthorized":
          w.authorized = false;
          return;
      }
      return;
    }
    case "installPrompt":
      w.installable = true;
      return;
    case "install":
      if (!w.installable) return;
      w.installable = false;
      s.emit({ kind: "showInstallPrompt" });
      return;
    case "workerWaiting":
      w.updateWaiting = true;
      return;
    case "update":
      if (!w.updateWaiting) return;
      // Held changes go first; any still unsent are stored for the reload.
      releaseHeld(s);
      dispatch(s);
      s.emit({ kind: "activateWorker" });
      return;
    case "storageBlocked":
      w.storing = false;
      w.pending = w.pending.map((it) =>
        it.kept === "storing" ? { ...it, kept: "unkept" } : it,
      );
      s.emit({ kind: "closeStorage" });
      return;
    case "stored":
    case "storeFailed": {
      const keys = new Set(event.keys);
      const kept = event.type === "stored" ? "kept" : "unkept";
      w.pending = w.pending.map((it) =>
        keys.has(it.key) && it.kept === "storing" ? { ...it, kept } : it,
      );
      return;
    }
    case "sent":
      if (w.inFlight?.kind !== "send" || w.inFlight.id !== event.requestId) {
        return;
      }
      answered(s, w.inFlight, event.outcome);
      return;
    case "polled": {
      const flight = w.inFlight;
      if (flight?.kind !== "poll" || flight.id !== event.requestId) return;
      w.inFlight = null;
      switch (event.outcome.kind) {
        case "saved": {
          s.emit({
            kind: "mergePoll",
            planIds: flight.planIds,
            data: event.outcome.data,
          });
          const cutoffs = { ...w.cutoffs };
          flight.planIds.forEach((planId) => {
            cutoffs[planId] = flight.startedAt - POLL_MARGIN_MS;
          });
          w.cutoffs = cutoffs;
          const retiring = new Set(flight.retiring);
          w.pending = w.pending.filter(
            (it) => !(retiring.has(it.key) && it.phase === "answered"),
          );
          w.failures = 0;
          w.pollDueAt = flight.startedAt + POLL_INTERVAL_MS;
          if (w.snapshotting && hasResults(event.outcome.data)) {
            s.emit({ kind: "snapshot", takenAt: flight.startedAt });
          }
          return;
        }
        case "refused":
          w.pollDueAt = flight.startedAt + POLL_INTERVAL_MS;
          return;
        case "unreachable":
          if (flight.abort !== "reconnect") backOff(s);
          return;
        case "unauthorized":
          w.authorized = false;
          return;
      }
    }
  }
}

function add(s: Stepping, change: Change, hold: boolean, group?: string) {
  const { w, at } = s;
  if (change.kind === "rename") {
    const waiting = w.pending.find(
      (it) =>
        it.phase === "ready" &&
        it.change.kind === "rename" &&
        it.change.id === change.id,
    );
    if (waiting !== undefined && waiting.group === undefined) {
      s.replace(s.keep([{ ...waiting, change }])[0]);
      return;
    }
  }
  const held = hold && change.kind === "status" && REMOVALS.has(change.status);
  const entry: Pending = {
    key: `${w.pageLoadId}-${++w.lastKey}`,
    seq: s.nextSeq(),
    change,
    phase: held ? "held" : "ready",
    ...(held ? { holdUntil: at + UNDO_WINDOW_MS } : {}),
    ...(group === undefined ? {} : { group }),
    kept: "unkept",
  };
  s.insert(s.keep([entry])[0]);
  if (change.kind === "create") s.emit({ kind: "writeDraft", change });
}

/** I release every held change now, to be sent outliving the page. */
function releaseHeld(s: Stepping) {
  const { w } = s;
  w.pending = w.pending.map((it) => {
    if (it.phase !== "held") return it;
    w.keepalive = true;
    const { holdUntil: _, ...released } = it;
    return { ...released, phase: "ready" };
  });
}

function releaseExpired(s: Stepping) {
  const { w, at } = s;
  w.pending = w.pending.map((it) => {
    if (it.phase !== "held" || (it.holdUntil ?? 0) > at) return it;
    const { holdUntil: _, ...released } = it;
    return { ...released, phase: "ready" };
  });
}

function reconnect(s: Stepping) {
  const { w, at } = s;
  w.failures = 0;
  w.retryAt = 0;
  w.pollDueAt = Math.min(w.pollDueAt, at);
}

function backOff(s: Stepping) {
  const { w, at } = s;
  w.failures += 1;
  w.retryAt =
    at + Math.min(RETRY_BASE_MS * 2 ** (w.failures - 1), RETRY_MAX_MS);
}

function checkDeadline(s: Stepping) {
  const { w, at } = s;
  if (w.inFlight === null || w.inFlight.abort !== null) return;
  if (at < w.inFlight.deadline) return;
  w.inFlight = { ...w.inFlight, abort: "timeout" };
  s.emit({ kind: "abort" });
}

function answered(s: Stepping, flight: InFlight, outcome: SendOutcome) {
  const { w } = s;
  w.inFlight = null;
  const batch = flight.keys.map((key) =>
    w.pending.find((it) => it.key === key)!,
  );
  const ready = (entries: readonly Pending[]) =>
    entries.forEach((it) => s.replace({ ...it, phase: "ready" }));
  switch (outcome.kind) {
    case "saved":
      saved(s, flight, batch, outcome.data);
      return;
    case "refused": {
      const named =
        outcome.fields.length === 0
          ? batch
          : outcome.fields.map((i) => batch[i]).filter(Boolean);
      const groups = new Set(named.map((it) => it.group).filter(Boolean));
      const blamed = batch.filter(
        (it) => named.includes(it) || groups.has(it.group),
      );
      ready(batch.filter((it) => !blamed.includes(it)));
      blamed.forEach((it) => s.refuse(it));
      return;
    }
    case "unreachable":
      ready(batch);
      if (flight.abort !== "reconnect") backOff(s);
      return;
    case "unauthorized":
      ready(batch);
      w.authorized = false;
      return;
  }
}

/** I give the id a saved field answered with, if it did. */
function answeredId(data: unknown, i: number): string | undefined {
  const planner = (data as { planner?: Record<string, { id?: string }> })
    ?.planner;
  return planner?.[`s${i}`]?.id ?? undefined;
}

function saved(
  s: Stepping,
  flight: InFlight,
  batch: readonly Pending[],
  data: unknown,
) {
  const { w } = s;
  w.failures = 0;
  w.pollDueAt = Math.min(w.pollDueAt, s.at);
  s.emit({ kind: "writeSaved", changes: flight.changes, data });
  s.forget(batch.map((it) => it.key));
  batch.forEach((entry, i) => {
    const sent = flight.changes[i];
    if (entry.change.kind !== "create" || sent.kind !== "create") {
      s.replace({ ...entry, phase: "answered", change: sent as Change });
      return;
    }
    const draftId = entry.change.id;
    const id = answeredId(data, i);
    if (id === undefined) {
      s.refuse(entry);
      return;
    }
    w.aliases = { ...w.aliases, [draftId]: id };
    s.replace({ ...entry, phase: "answered", change: { ...sent, id } });
    s.emit({ kind: "evictDraft", id: draftId });
    s.emit({ kind: "created", draftId, id });
    const swap = (it: string) => (it === draftId ? id : it);
    const rewritten = w.pending
      .filter(
        (it) =>
          it.phase !== "answered" && namedIds(it.change).includes(draftId),
      )
      .map((it) => ({ ...it, change: mapIds(it.change, swap) }));
    s.storeAgain(rewritten);
    rewritten.forEach((it) => s.replace(it));
    if (entry.change.bucketId !== undefined) {
      const assign: AssignBucketChange = {
        kind: "assignBucket",
        id,
        planId: entry.change.planId,
        name: entry.change.name,
        bucketId: entry.change.bucketId,
      };
      s.insert(
        s.keep([
          {
            key: `${w.pageLoadId}-${++w.lastKey}`,
            seq: entry.seq + 0.5,
            change: assign,
            phase: "ready",
            kept: "unkept",
          },
        ])[0],
      );
    }
  });
}

/** I give a change as it is sent, or null when it names a lost draft. */
function toSent(w: Work, change: Change): SentChange | null {
  const resolved = mapIds(change, (id) => w.aliases[id] ?? id);
  if (namedIds(resolved).some(isDraftId)) return null;
  if (resolved.kind !== "create") return resolved;
  const { bucketId: _, ...sent } = resolved;
  return sent;
}

function dispatch(s: Stepping) {
  const { w, at } = s;
  if (
    w.inFlight !== null ||
    w.lifecycle !== "running" ||
    !w.online ||
    !w.authorized ||
    at < w.retryAt
  ) {
    return;
  }
  if (send(s)) return;
  if (w.seedWanted) {
    seed(s);
    return;
  }
  poll(s);
}

/** I tell whether a poll brought anything. */
function hasResults(data: unknown): boolean {
  const planner = (data as { planner?: Record<string, unknown> } | null)
    ?.planner;
  return Object.values(planner ?? {}).some(
    (it) => Array.isArray(it) && it.length > 0,
  );
}

/** I ask for the Shopping query, so the cache can be snapshotted. */
function seed(s: Stepping) {
  const { w, at } = s;
  w.inFlight = {
    kind: "seed",
    id: ++w.lastRequestId,
    deadline: at + REQUEST_TIMEOUT_MS,
    abort: null,
    keys: [],
    changes: [],
    planIds: [],
    startedAt: at,
    retiring: [],
  };
  s.emit({ kind: "seed", requestId: w.inFlight.id });
}

function send(s: Stepping): boolean {
  const { w, at } = s;
  const batch: Pending[] = [];
  const changes: SentChange[] = [];
  for (const entry of [...w.pending]) {
    if (entry.phase !== "ready") continue;
    if (entry.kept === "storing") break;
    const sent = toSent(w, entry.change);
    if (sent === null) {
      s.refuse(entry);
      continue;
    }
    batch.push(entry);
    changes.push(sent);
    if (entry.change.kind === "create") break;
  }
  if (batch.length === 0) return false;
  batch.forEach((it) => s.replace({ ...it, phase: "sending" }));
  w.inFlight = {
    kind: "send",
    id: ++w.lastRequestId,
    deadline: at + REQUEST_TIMEOUT_MS,
    abort: null,
    keys: batch.map((it) => it.key),
    changes,
    planIds: [],
    startedAt: at,
    retiring: [],
  };
  s.emit({
    kind: "send",
    requestId: w.inFlight.id,
    changes,
    keepalive: w.keepalive,
  });
  w.keepalive = false;
  return true;
}

function poll(s: Stepping) {
  const { w, at } = s;
  const planIds = Object.keys(w.watched);
  if (!w.visible || planIds.length === 0 || at < w.pollDueAt) return;
  const polled = new Set(planIds);
  w.inFlight = {
    kind: "poll",
    id: ++w.lastRequestId,
    deadline: at + REQUEST_TIMEOUT_MS,
    abort: null,
    keys: [],
    changes: [],
    planIds,
    startedAt: at,
    retiring: w.pending
      .filter((it) => it.phase === "answered" && polled.has(it.change.planId))
      .map((it) => it.key),
  };
  s.emit({
    kind: "poll",
    requestId: w.inFlight.id,
    requests: planIds.map((planId) => ({
      planId,
      cutoff: w.cutoffs[planId] ?? w.renderedAt - POLL_MARGIN_MS,
    })),
  });
}
