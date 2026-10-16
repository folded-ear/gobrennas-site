"use client";

import { ExpandDownIcon, ExpandUpIcon } from "@/components/icons";
import { useDragSession } from "@/lib/dnd/drag-session";
import { Button, Tabs } from "@heroui/react";
import clsx from "clsx";
import { useId, useState, type ReactNode } from "react";

type PlannerPanelProps = {
  count: number;
  children: ReactNode;
};

/** Keeps recipes within reach while the calendar scrolls independently. */
export function PlannerPanel({ count, children }: PlannerPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const contentId = useId();
  const { dragged } = useDragSession();
  const ToggleIcon = expanded ? ExpandDownIcon : ExpandUpIcon;

  return (
    <aside
      aria-label="Planning tools"
      className={clsx(
        "flex min-h-0 shrink-0 flex-col border-t-2 border-separator bg-accent/5 md:border-t-0 md:border-l-2",
        expanded
          ? "h-[40%] md:h-full md:w-[32%] md:min-w-80 md:max-w-[30rem]"
          : "md:w-44",
      )}
    >
      <Tabs
        selectedKey="unplanned"
        variant="secondary"
        className="min-h-0 flex-1 gap-0"
      >
        <div className="flex shrink-0 items-center justify-between gap-xs border-b border-separator px-sm">
          <Tabs.ListContainer className="min-w-0 rounded-none bg-transparent">
            <Tabs.List aria-label="Planning tools" className="p-0">
              <Tabs.Tab
                id="unplanned"
                className="h-11 rounded-none whitespace-nowrap border-b-2 border-accent px-xs text-accent"
                onPress={() => setExpanded(true)}
              >
                Unplanned · {count}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Button
            isIconOnly
            variant="ghost"
            aria-label={
              expanded ? "Collapse planning tools" : "Expand planning tools"
            }
            aria-expanded={expanded}
            aria-controls={contentId}
            isDisabled={dragged !== null}
            onPress={() => setExpanded((value) => !value)}
          >
            <ToggleIcon className="md:-rotate-90" />
          </Button>
        </div>
        <Tabs.Panel
          id="unplanned"
          hidden={!expanded}
          className={clsx("min-h-0 flex-1 p-0", !expanded && "hidden")}
        >
          <div
            id={contentId}
            className="h-full overflow-y-auto overscroll-contain px-md pb-md"
          >
            {children}
          </div>
        </Tabs.Panel>
      </Tabs>
    </aside>
  );
}
