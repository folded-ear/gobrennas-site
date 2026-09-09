"use client";

import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const HISTORY_KEY = "drawer";

type Memento = unknown;

type DrawerRecord = {
  collapsed: boolean;
  memento: Memento;
};

type ActiveDrawer = DrawerRecord & {
  id: string;
};

type DrawerContextValue = {
  active: ActiveDrawer | null;
  containerEl: HTMLElement | null;
  setContainerEl: Dispatch<SetStateAction<HTMLElement | null>>;
  activate: (id: string, defaultCollapsed: boolean) => void;
  deactivate: (id: string) => void;
  setCollapsed: (collapsed: boolean) => void;
  setMemento: (memento: Memento) => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

type HistoryDrawerState = Record<string, Memento>;

function readMemento(id: string): Memento {
  const state = window.history.state?.[HISTORY_KEY] as
    HistoryDrawerState | undefined;
  return state?.[id];
}

function writeMemento(id: string, memento: Memento) {
  // Next writes its own history entry from a passive effect above this
  // provider, dropping unknown state keys on a forward navigation; deferring
  // past that flush lands the memento on the entry it belongs to.
  queueMicrotask(() =>
    window.history.replaceState(
      { ...window.history.state, [HISTORY_KEY]: { [id]: memento } },
      "",
    ),
  );
}

export function DrawerProvider({ children }: PropsWithChildren) {
  const [active, setActive] = useState<ActiveDrawer | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);
  const archive = useRef(new Map<string, DrawerRecord>());

  const activeId = active?.id;
  const memento = active?.memento;

  useEffect(() => {
    if (!active) return;
    archive.current.set(active.id, {
      collapsed: active.collapsed,
      memento: active.memento,
    });
  }, [active]);

  useEffect(() => {
    if (activeId === undefined) return;
    writeMemento(activeId, memento);
  }, [activeId, memento]);

  const activate = useCallback((id: string, defaultCollapsed: boolean) => {
    const saved = archive.current.get(id);
    const fromHistory = readMemento(id);
    setActive({
      id,
      collapsed: saved?.collapsed ?? defaultCollapsed,
      memento: fromHistory === undefined ? saved?.memento : fromHistory,
    });
  }, []);

  const deactivate = useCallback((id: string) => {
    setActive((prev) => (prev?.id === id ? null : prev));
  }, []);

  const setCollapsed = useCallback((collapsed: boolean) => {
    setActive((prev) => (prev ? { ...prev, collapsed } : prev));
  }, []);

  const setMemento = useCallback((next: Memento) => {
    setActive((prev) => (prev ? { ...prev, memento: next } : prev));
  }, []);

  return (
    <DrawerContext.Provider
      value={{
        active,
        containerEl,
        setContainerEl,
        activate,
        deactivate,
        setCollapsed,
        setMemento,
      }}
    >
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawerContext() {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error("A DrawerProvider must enclose this component.");
  }
  return context;
}
