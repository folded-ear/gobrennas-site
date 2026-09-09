"use client";

import { DrawerCloseIcon, DrawerOpenIcon } from "@/components/icons";
import { ResizeHandle } from "@/components/resize-handle";
import { useDrawerContext } from "@/providers/drawer-provider";
import { Button, ScrollShadow } from "@heroui/react";
import { useState } from "react";

const MIN_WIDTH = 210;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 420;
const COLLAPSED_WIDTH = 40;
const CONTENT_ID = "drawer-content";

export const Drawer = () => {
  const { active, setCollapsed, setContainerEl } = useDrawerContext();
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  if (!active) return null;

  const { collapsed } = active;

  return (
    <aside
      className="sticky top-0 flex h-screen shrink-0 flex-col border-l border-divider transition-all bg-surface"
      style={{ width: collapsed ? COLLAPSED_WIDTH : width }}
    >
      {!collapsed && (
        <ResizeHandle
          side="left"
          width={width}
          minWidth={MIN_WIDTH}
          maxWidth={MAX_WIDTH}
          onWidthChange={setWidth}
          label="Resize drawer"
        />
      )}

      <Button
        isIconOnly
        variant="secondary"
        size="sm"
        className="absolute -left-3 top-2 z-10 h-6 w-6 min-w-6 rounded-full border border-divider shadow-sm"
        aria-label={collapsed ? "Open drawer" : "Close drawer"}
        aria-expanded={!collapsed}
        aria-controls={CONTENT_ID}
        onPress={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <DrawerOpenIcon size="small" />
        ) : (
          <DrawerCloseIcon size="small" />
        )}
      </Button>

      {/* stays mounted while collapsed so drawer content keeps its state */}
      <div
        id={CONTENT_ID}
        className="flex flex-1 min-h-0"
        style={{ display: collapsed ? "none" : undefined }}
      >
        <ScrollShadow className="flex flex-1 flex-col min-h-0 p-md">
          <div ref={setContainerEl} className="flex-1" />
        </ScrollShadow>
      </div>
    </aside>
  );
};
