"use client";

import { Drawer } from "@heroui/react";
import { useRouter } from "next/navigation";
import {
  createContext,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type ScreenEscape = {
  /** I keep Escape from closing the Screen until the unblock I give runs. */
  block(): () => void;
};

const ScreenEscapeContext = createContext<ScreenEscape>({
  block: () => () => {},
});

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
  const [blocks, setBlocks] = useState(0);
  const block = useCallback(() => {
    setBlocks((n) => n + 1);
    return () => setBlocks((n) => n - 1);
  }, []);
  return (
    <ScreenEscapeContext value={{ block }}>
      <Drawer.Backdrop
        isOpen={isOpen}
        isKeyboardDismissDisabled={blocks > 0}
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
    </ScreenEscapeContext>
  );
}

/**
 * While blocked, I keep the nearest Screen I'm inside from closing on
 * Escape, leaving the key to whatever else wants it. Outside any Screen,
 * I do nothing.
 */
export function useBlockScreenEscape(isBlocked: boolean): void {
  const { block } = useContext(ScreenEscapeContext);
  useEffect(() => (isBlocked ? block() : undefined), [block, isBlocked]);
}
