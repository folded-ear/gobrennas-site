"use client";

import { Drawer } from "@heroui/react";
import { useRouter } from "next/navigation";
import { PropsWithChildren, ReactNode } from "react";

type ScreenProps = PropsWithChildren<{
  /** Names me for assistive technology. */
  label: string;
  /** Shown above my content, staying put while the content scrolls. */
  header?: ReactNode;
  isOpen?: boolean;
}>;

/**
 * I slide in over everything else to show one thing. However I'm
 * dismissed — my close button, a flick to the right, Escape — I go back
 * in history, and it's leaving the history entry I belong to that closes
 * me.
 */
export function Screen({
  label,
  header,
  isOpen = true,
  children,
}: ScreenProps) {
  const router = useRouter();
  return (
    <Drawer.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <Drawer.Content placement="right">
        <Drawer.Dialog
          aria-label={label}
          // The padding moves inside the header and the scrolling body, so
          // the body scrolls right to my edges.
          className="w-full max-w-none p-0 sm:max-w-[90vw]"
        >
          <Drawer.Header className="gap-0 px-xl pt-xl text-base text-foreground">
            {/* in its own row, so the header never runs underneath it */}
            <div className="flex justify-end">
              <Drawer.CloseTrigger className="static" />
            </div>
            {header}
          </Drawer.Header>
          <Drawer.Body className="m-0 px-xl pb-xl text-base text-foreground">
            {children}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
