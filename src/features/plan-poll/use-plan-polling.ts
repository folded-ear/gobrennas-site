import { ApolloClient } from "@apollo/client";
import { useApolloClient } from "@apollo/client/react";
import { useEffect } from "react";
import { fetchPlanChanges } from "./fetch";
import { createPoller, Poller } from "./poller";

const pollers = new WeakMap<ApolloClient, Poller>();

const isVisible = () => document.visibilityState === "visible";

/** I give a client's one poller, making it the first time. */
function pollerFor(client: ApolloClient): Poller {
  let poller = pollers.get(client);
  if (poller === undefined) {
    const created = createPoller({
      fetchChanges: (requests) => fetchPlanChanges(client, requests),
    });
    document.addEventListener("visibilitychange", () =>
      created.setVisible(isVisible()),
    );
    pollers.set(client, created);
    poller = created;
  }
  return poller;
}

/**
 * I keep the given plans current with other users' changes while the
 * caller is mounted and the page is visible.
 */
export function usePlanPolling(planIds: readonly string[]): void {
  const client = useApolloClient();
  const key = planIds.join(",");
  useEffect(() => {
    const poller = pollerFor(client);
    poller.setVisible(isVisible());
    poller.track(key === "" ? [] : key.split(","));
    return () => poller.track([]);
  }, [client, key]);
}
