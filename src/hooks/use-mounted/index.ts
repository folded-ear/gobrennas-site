import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

/** I say whether I'm rendering in the browser, past hydration. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}
