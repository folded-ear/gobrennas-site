"use client";

import { rand_chars } from "@/lib/entropy";
import { displayName } from "@/lib/plan-item-name";
import { useApolloClient } from "@apollo/client/react";
import { toast } from "@heroui/react";
import { Serwist } from "@serwist/window";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { createPageLocks } from "./locks";
import { publishView } from "./overlay";
import { createRunner, Runner, SyncStatus, WorkerHost } from "./runner";
import type {
  AssignBucketChange,
  Change,
  CreateChange,
  MoveChange,
  RenameChange,
  StatusChange,
} from "./state";
import { createIdbStore } from "./store";

const PAGE_LOAD_ID_LENGTH = 12;
const SERVICE_WORKER_URL = "/serwist/sw.js";
const SERVICE_WORKER_SCOPE = "/";

/** I give the app's service worker, where there is one: production only. */
function serviceWorker(): WorkerHost | null {
  if (
    process.env.NODE_ENV !== "production" ||
    !("serviceWorker" in navigator)
  ) {
    return null;
  }
  const serwist = new Serwist(SERVICE_WORKER_URL, {
    scope: SERVICE_WORKER_SCOPE,
    type: "module",
    updateViaCache: "none",
  });
  return {
    register(onWaiting) {
      serwist.addEventListener("waiting", onWaiting);
      // One that began waiting before this page loaded fires no event.
      void serwist.register().then((it) => it?.waiting && onWaiting());
    },
    activate() {
      serwist.addEventListener("controlling", () => window.location.reload());
      serwist.messageSkipWaiting();
    },
  };
}

/** What a screen asks of its page's sync engine. */
export type PlanSync = {
  /** I send changes together, as soon as I can. */
  set(changes: readonly Change[]): void;
  /** I hold a COMPLETED or DELETED change for its undo window, then send it. */
  hold(change: StatusChange): void;
  /** I drop a held change that has yet to be sent. */
  cancel(id: string): void;
  /** I send every held change now, in requests that outlive the page. */
  flush(): void;
  rename(change: RenameChange): void;
  move(change: MoveChange): void;
  assignBucket(change: AssignBucketChange): void;
  /**
   * I create an item, shown at once under its draft id. I resolve with its
   * real id once the server has it, or null if it was refused.
   */
  create(change: CreateChange): Promise<string | null>;
  /** I give an item's real id, for one created from a draft. */
  resolve(id: string): string;
  /** I count the user's changes the server has yet to answer. */
  unsent(): Promise<number>;
  /** I show the browser's install prompt, if it's held. */
  install(): void;
  /** I switch to the waiting version of the app, sending held changes first. */
  update(): void;
  /** I forget what this device keeps of the user's shopping. */
  forgetDevice(): Promise<void>;
};

const PlanSyncContext = createContext<Runner | null>(null);

const MOVES: ReadonlySet<Change["kind"]> = new Set(["move", "assignBucket"]);

/** I say what couldn't be saved, by name when it's all one item. */
function reportFailure(failed: readonly Change[]) {
  if (new Set(failed.map((it) => it.name)).size > 1) {
    toast.danger(`Couldn't save ${failed.length} items`);
    return;
  }
  const verb = failed.every((it) => MOVES.has(it.kind)) ? "move" : "save";
  toast.danger(`Couldn't ${verb} ${displayName(failed[0].name)}`);
}

type PlanSyncProps = PropsWithChildren<{
  /** The signed-in user, whose changes are kept; none when signed out. */
  readonly userId: string | null;
  /** When the server rendered the page. */
  readonly renderedAt: number;
  /** The app's service worker; left out, the real one, where there is one. */
  readonly worker?: WorkerHost | null;
}>;

/**
 * I run the page's sync engine for the plans shown under me. It is made on
 * the client's first render, so screens below can post to it from their
 * own effects, which run before mine; it starts once I mount.
 */
export function PlanSync({
  userId,
  renderedAt,
  worker,
  children,
}: PlanSyncProps) {
  const client = useApolloClient();
  const [runner] = useState(() => {
    if (typeof window === "undefined") return null;
    const pageLoadId = rand_chars(PAGE_LOAD_ID_LENGTH);
    const canStore = userId !== null && typeof indexedDB !== "undefined";
    const store = canStore
      ? createIdbStore(() => made.post({ type: "storageBlocked" }))
      : null;
    const made: Runner = createRunner({
      client,
      pageLoadId,
      userId,
      renderedAt,
      store,
      snapshots: store,
      buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? "",
      locks: createPageLocks(navigator.locks, pageLoadId),
      toast: reportFailure,
      publish: (view) => publishView(client.cache, view),
      worker: worker === undefined ? serviceWorker() : worker,
    });
    return made;
  });
  useEffect(() => {
    runner?.start();
    return () => runner?.stop();
  }, [runner]);
  return <PlanSyncContext value={runner}>{children}</PlanSyncContext>;
}

/**
 * I give the sync engine of the page I'm rendered in. Asking anything of it
 * on the server does nothing.
 */
export function usePlanSync(): PlanSync {
  const runner = useContext(PlanSyncContext);
  return useMemo(() => {
    const post: Runner["post"] = (event) => runner?.post(event);
    return {
      set: (changes) => post({ type: "changes", changes }),
      hold: (change) => post({ type: "change", change, hold: true }),
      cancel: (id) => post({ type: "cancel", id }),
      flush: () => post({ type: "flush" }),
      rename: (change) => post({ type: "change", change }),
      move: (change) => post({ type: "change", change }),
      assignBucket: (change) => post({ type: "change", change }),
      create: (change) => runner?.create(change) ?? Promise.resolve(null),
      resolve: (id) => runner?.resolve(id) ?? id,
      unsent: () => runner?.unsent() ?? Promise.resolve(0),
      install: () => post({ type: "install" }),
      update: () => post({ type: "update" }),
      forgetDevice: () => runner?.forget() ?? Promise.resolve(),
    };
  }, [runner]);
}

/** I keep the given plans current while the caller is mounted. */
export function useWatchPlans(planIds: readonly string[]): void {
  const runner = useContext(PlanSyncContext);
  const key = planIds.join(",");
  useEffect(() => {
    const watched = key === "" ? [] : key.split(",");
    runner?.post({ type: "watch", planIds: watched });
    return () => runner?.post({ type: "unwatch", planIds: watched });
  }, [runner, key]);
}

/** What the server renders, before the engine has said anything. */
const SERVER_STATUS: SyncStatus = {
  online: true,
  authorized: true,
  installable: false,
  updateWaiting: false,
};

const noSubscription = () => () => {};

/** I give the page's sync status, following it as it changes. */
export function useSyncStatus(): SyncStatus {
  const runner = useContext(PlanSyncContext);
  return useSyncExternalStore(
    runner?.subscribe ?? noSubscription,
    () => runner?.status() ?? SERVER_STATUS,
    () => SERVER_STATUS,
  );
}
