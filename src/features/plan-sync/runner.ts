import type { ApolloClient } from "@apollo/client";
import {
  evictDraft,
  writeDraft,
  writePolled,
  writeSaved,
} from "./cache-writes";
import type { PageLocks } from "./locks";
import { changeMutation, pollQuery } from "./mutation";
import { pollOutcome, sendOutcome } from "./outcome";
import type {
  Change,
  ChangeRecord,
  CreateChange,
  Effect,
  Posted,
  State,
} from "./state";
import { initialState, step } from "./step";
import type { ChangeStore } from "./store";
import { buildView, type View } from "./view";
import { nextWake } from "./wake";

/** What the page shows of the engine. */
export type SyncStatus = {
  readonly online: boolean;
  readonly authorized: boolean;
};

export type RunnerDeps = {
  readonly client: ApolloClient;
  readonly pageLoadId: string;
  /** Null when signed out. */
  readonly userId: string | null;
  /** When the server rendered the page. */
  readonly renderedAt: number;
  /** Null when nothing is stored. */
  readonly store: ChangeStore | null;
  readonly locks: PageLocks;
  readonly toast: (failed: readonly Change[]) => void;
  readonly publish: (view: View) => void;
};

/** A page's sync engine, with the effects of its steps carried out. */
export type Runner = {
  start(): void;
  stop(): void;
  post(event: Posted): void;
  /** I post a create, resolving with its real id, or null if refused. */
  create(change: CreateChange): Promise<string | null>;
  /** I give an item's real id, for one created from a draft. */
  resolve(id: string): string;
  /** I count the user's changes the server has yet to answer. */
  unsent(): Promise<number>;
  subscribe(listener: () => void): () => void;
  status(): SyncStatus;
};

const isVisible = () => document.visibilityState === "visible";

/**
 * I make a page's sync engine: I feed its events through step one at a
 * time, carry out the effects, and keep its one timer. I alone listen to
 * the browser's events for it.
 */
export function createRunner({
  client,
  pageLoadId,
  userId,
  renderedAt,
  store,
  locks,
  toast,
  publish,
}: RunnerDeps): Runner {
  let state: State = initialState({
    pageLoadId,
    userId: store === null ? null : userId,
    renderedAt,
    online: navigator.onLine,
    visible: isVisible(),
  });
  const mailbox: Posted[] = [];
  let stepping = false;
  let running = false;
  let booted = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** The request out, and which of the engine's it is. */
  let request: { id: number; controller: AbortController } | null = null;
  let storing: Promise<unknown> = Promise.resolve();
  const waiting = new Map<string, (id: string | null) => void>();
  const listeners = new Set<() => void>();
  let status: SyncStatus = { online: state.online, authorized: true };

  function post(event: Posted) {
    mailbox.push(event);
    if (stepping) return;
    stepping = true;
    const before = state;
    try {
      while (mailbox.length > 0) {
        const next = step(state, { ...mailbox.shift()!, at: Date.now() });
        state = next.state;
        next.effects.forEach(run);
      }
    } finally {
      stepping = false;
    }
    if (state.pending !== before.pending) publish(buildView(state.pending));
    announce();
    arm();
  }

  function announce() {
    if (
      status.online === state.online &&
      status.authorized === state.authorized
    ) {
      return;
    }
    status = { online: state.online, authorized: state.authorized };
    listeners.forEach((it) => it());
  }

  function arm() {
    clearTimeout(timer);
    const wake = nextWake(state);
    if (wake === null || !running) return;
    timer = setTimeout(
      () => post({ type: "tick" }),
      Math.max(0, wake - Date.now()),
    );
  }

  /** I store records in order, one write after another. */
  function keep(put: readonly ChangeRecord[], remove: readonly string[]) {
    const keys = put.map((it) => it.key);
    storing = storing
      .then(() => store!.apply(put, remove))
      .then(
        () => keys.length > 0 && post({ type: "stored", keys }),
        () => keys.length > 0 && post({ type: "storeFailed", keys }),
      );
  }

  function run(effect: Effect) {
    switch (effect.kind) {
      case "store":
        if (store !== null) keep(effect.put, effect.remove);
        return;
      case "send": {
        const { requestId } = effect;
        if (!running) return;
        const controller = new AbortController();
        request = { id: requestId, controller };
        const { mutation, variables } = changeMutation(effect.changes);
        client
          .mutate({
            mutation,
            variables,
            errorPolicy: "all",
            fetchPolicy: "no-cache",
            context: {
              fetchOptions: {
                keepalive: effect.keepalive,
                signal: controller.signal,
              },
            },
          })
          .then(
            ({ data, error }) => sendOutcome({ data, error }),
            (thrown: unknown) => sendOutcome({ thrown }),
          )
          .then((outcome) => post({ type: "sent", requestId, outcome }));
        return;
      }
      case "poll": {
        const { requestId } = effect;
        if (!running) return;
        const controller = new AbortController();
        request = { id: requestId, controller };
        const { query, variables } = pollQuery(effect.requests);
        client
          .query({
            query,
            variables,
            errorPolicy: "all",
            fetchPolicy: "no-cache",
            context: { fetchOptions: { signal: controller.signal } },
          })
          .then(
            ({ data, error }) => pollOutcome({ data, error }),
            (thrown: unknown) => pollOutcome({ thrown }),
          )
          .then((outcome) => post({ type: "polled", requestId, outcome }));
        return;
      }
      case "abort":
        request?.controller.abort();
        request = null;
        return;
      case "writeDraft":
        writeDraft(client.cache, effect.change);
        return;
      case "evictDraft":
        evictDraft(client.cache, effect.id);
        return;
      case "writeSaved":
        writeSaved(client.cache, effect.changes, effect.data);
        return;
      case "mergePoll":
        writePolled(client.cache, effect.planIds, effect.data);
        return;
      case "toast":
        toast(effect.failed);
        return;
      case "created":
        waiting.get(effect.draftId)?.(effect.id);
        waiting.delete(effect.draftId);
        return;
      case "freeze":
        locks.release();
        store?.close();
        return;
      case "thaw":
        void locks.reacquire().then(async () => {
          store?.open();
          const keys = store === null ? [] : await store.keysOf(pageLoadId);
          post({ type: "restored", keys });
        });
        return;
      case "closeStorage":
        store?.close();
        return;
    }
  }

  /** I adopt the user's changes kept by page loads that are gone. */
  async function adopt(): Promise<readonly ChangeRecord[]> {
    if (store === null || userId === null) return [];
    const records = await store.claimFor(userId);
    const adopted: ChangeRecord[] = [];
    const gone = new Set(
      records.map((it) => it.pageLoadId).filter((it) => it !== pageLoadId),
    );
    for (const other of gone) {
      const moved = await locks.adopt(other, () =>
        store.reassign(other, pageLoadId),
      );
      if (moved !== null) adopted.push(...moved);
    }
    return adopted;
  }

  const onOnline = () => post({ type: "online" });
  const onOffline = () => post({ type: "offline" });
  const onVisibility = () => post({ type: isVisible() ? "visible" : "hidden" });
  const onPageHide = (e: PageTransitionEvent) =>
    post({ type: "pagehide", persisted: e.persisted });
  const onPageShow = (e: PageTransitionEvent) =>
    post({ type: "pageshow", persisted: e.persisted });

  /**
   * I fail a request the engine thinks is out but isn't, as one made while
   * stopped never went, so the engine can try again.
   */
  function failLost() {
    const flight = state.inFlight;
    if (flight === null || request?.id === flight.id) return;
    const outcome = { kind: "unreachable" } as const;
    post(
      flight.kind === "send"
        ? { type: "sent", requestId: flight.id, outcome }
        : { type: "polled", requestId: flight.id, outcome },
    );
  }

  return {
    start() {
      if (running) return;
      running = true;
      locks.hold();
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("pagehide", onPageHide);
      window.addEventListener("pageshow", onPageShow);
      failLost();
      arm();
      if (booted) return;
      booted = true;
      void adopt().then(
        (adopted) => post({ type: "boot", adopted }),
        () => {
          post({ type: "boot", adopted: [] });
          post({ type: "storageBlocked" });
        },
      );
    },
    stop() {
      if (!running) return;
      running = false;
      clearTimeout(timer);
      request?.controller.abort();
      request = null;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      locks.release();
      store?.close();
    },
    post,
    create(change) {
      const created = new Promise<string | null>((resolve) =>
        waiting.set(change.id, resolve),
      );
      post({ type: "change", change });
      return created;
    },
    resolve: (id) => state.aliases[id] ?? id,
    async unsent() {
      if (store !== null && userId !== null) return store.count(userId);
      return state.pending.filter((it) => it.phase !== "answered").length;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    status: () => status,
  };
}
