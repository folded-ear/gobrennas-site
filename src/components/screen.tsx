"use client";

import { Drawer } from "@heroui/react";
import { useRouter } from "next/navigation";
import { PropsWithChildren } from "react";

type ScreenProps = PropsWithChildren<{
  /** Names me for assistive technology. */
  label: string;
  isOpen?: boolean;
}>;

/**
 * I slide in over everything else to show one thing. However I'm
 * dismissed — my close button, a flick to the right, Escape — I go back
 * in history, and it's leaving the history entry I belong to that closes
 * me.
 */
export function Screen({ label, isOpen = true, children }: ScreenProps) {
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
          className="w-full max-w-none sm:max-w-[90vw]"
        >
          <Drawer.CloseTrigger />
          <Drawer.Body className="text-base text-foreground">
            {children}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
