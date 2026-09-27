import { ApolloClient } from "@apollo/client";
import { useApolloClient } from "@apollo/client/react";
import { toast } from "@heroui/react";
import { useMemo } from "react";
import { createChangeQueue, PlanChange, PlanChangeQueue } from "./queue";
import { aliasedSender } from "./send";

/** How long a completion or deletion can still be cancelled. */
export const UNDO_WINDOW_MS = 4000;

const queues = new WeakMap<ApolloClient, PlanChangeQueue>();

function reportFailure(client: ApolloClient, failed: readonly PlanChange[]) {
  toast.danger(
    failed.length === 1
      ? `Couldn't save ${failed[0].name}`
      : `Couldn't save ${failed.length} items`,
  );
  // One refused field fails the whole request, so the server may have
  // saved some of it after all.
  void client.refetchQueries({ include: "active" });
}

/**
 * I give a client's one change queue, making it the first time. It
 * outlives every screen, and sends what it holds once the page is hidden.
 */
function queueFor(client: ApolloClient): PlanChangeQueue {
  let queue = queues.get(client);
  if (queue === undefined) {
    const created = createChangeQueue({
      cache: client.cache,
      send: aliasedSender(client),
      delayMs: UNDO_WINDOW_MS,
      onFailure: (failed) => reportFailure(client, failed),
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") created.flush();
    });
    queues.set(client, created);
    queue = created;
  }
  return queue;
}

/**
 * I give the change queue of the client I'm rendered under. It is only
 * made once something is asked of it, which never happens on the server.
 */
export function usePlanChanges(): PlanChangeQueue {
  const client = useApolloClient();
  return useMemo(
    () => ({
      set: (changes) => queueFor(client).set(changes),
      hold: (change) => queueFor(client).hold(change),
      cancel: (id) => queueFor(client).cancel(id),
      flush: () => queueFor(client).flush(),
      rename: (change) => queueFor(client).rename(change),
      create: (change) => queueFor(client).create(change),
    }),
    [client],
  );
}
