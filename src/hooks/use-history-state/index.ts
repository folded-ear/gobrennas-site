import { useCallback, useState, useSyncExternalStore } from "react";

export type HistoryState<T> = {
  readonly value: T | undefined;
  /** Adds a history entry holding the value, so going back undoes it. */
  readonly push: (value: T) => void;
  /** Swaps the value on the current history entry. */
  readonly replace: (value: T) => void;
};

type Store = {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => unknown;
  write: (method: "pushState" | "replaceState", value: unknown) => void;
};

function readEntry(key: string): unknown {
  return window.history.state?.[key];
}

function createStore(key: string): Store {
  let loaded = false;
  let current: unknown;
  const listeners = new Set<() => void>();

  function load() {
    current = readEntry(key);
    loaded = true;
  }

  return {
    subscribe(onChange) {
      const onPopState = () => {
        load();
        onChange();
      };
      listeners.add(onChange);
      window.addEventListener("popstate", onPopState);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("popstate", onPopState);
      };
    },
    getSnapshot() {
      if (!loaded) load();
      return current;
    },
    write(method, value) {
      window.history[method]({ ...window.history.state, [key]: value }, "");
      current = value;
      loaded = true;
      listeners.forEach((it) => it());
    },
  };
}

function nothingOnTheServer() {
  return undefined;
}

/**
 * I keep a value on a browser history entry, under my key. I follow the
 * entry the user travels back or forward to, and my own writes. An entry
 * someone else pushes on top leaves me as I was, so whatever I show stays
 * shown beneath it.
 */
export function useHistoryState<T>(key: string): HistoryState<T> {
  const [store] = useState(() => createStore(key));
  const value = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    nothingOnTheServer,
  ) as T | undefined;
  const push = useCallback(
    (next: T) => store.write("pushState", next),
    [store],
  );
  const replace = useCallback(
    (next: T) => store.write("replaceState", next),
    [store],
  );
  return { value, push, replace };
}
