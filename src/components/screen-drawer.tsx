"use client";

import { useDrawerContext } from "@/providers/drawer-provider";
import { PropsWithChildren, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

export type DrawerSpec<M> = {
  readonly id: string;
  readonly defaultExpanded: boolean;
  /** I never hold a value; I carry the memento type. */
  readonly memento?: M;
};

type DefineDrawerOptions = {
  id: string;
  defaultExpanded?: boolean;
};

export function defineDrawer<M>({
  id,
  defaultExpanded = false,
}: DefineDrawerOptions): DrawerSpec<M> {
  return { id, defaultExpanded };
}

type ScreenDrawerProps<M> = PropsWithChildren<{
  drawer: DrawerSpec<M>;
}>;

/**
 * I put my children in the screen's drawer. I render nothing where I sit, so
 * where a screen places me in its markup doesn't matter.
 */
export function ScreenDrawer<M>({ drawer, children }: ScreenDrawerProps<M>) {
  const { containerEl, activate, deactivate } = useDrawerContext();
  const { id, defaultExpanded } = drawer;

  useLayoutEffect(() => {
    activate(id, !defaultExpanded);
    return () => deactivate(id);
  }, [activate, deactivate, id, defaultExpanded]);

  return containerEl ? createPortal(children, containerEl) : null;
}

export function useDrawer<M>(drawer: DrawerSpec<M>) {
  const { active, setCollapsed, setMemento } = useDrawerContext();
  const isActive = active?.id === drawer.id;
  const collapsed = isActive ? active.collapsed : !drawer.defaultExpanded;

  return {
    collapsed,
    memento: isActive ? (active.memento as M | undefined) : undefined,
    setMemento: setMemento as (memento: M | undefined) => void,
    expand: () => setCollapsed(false),
    collapse: () => setCollapsed(true),
    toggle: () => setCollapsed(!collapsed),
  };
}
