import { useSyncExternalStore } from "react";

let granted = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * I note that the browser gave a position this page load, though its
 * permission may still say it would ask.
 */
export function noteGranted(): void {
  if (granted) return;
  granted = true;
  listeners.forEach((it) => it());
}

/** I tell whether the browser gave a position this page load. */
export function useGrantedThisLoad(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => granted,
    () => false,
  );
}
