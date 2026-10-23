"use client";

import { ControlTooltip } from "@/components/control-tooltip";
import { OfflineIcon, SignedOutIcon, UpdateIcon } from "@/components/icons";
import { doLogin } from "@/constants";
import { usePageEngine, usePageStatus } from "@/features/page-engine";
import { Button, Spinner } from "@heroui/react";
import { useEffect, useState } from "react";

export const SIGN_IN_TIP =
  "Your login has expired. Sign in again to save your changes.";
export const UPDATE_TIP = "A new version is ready. Tap to update.";
export const RELOAD_DEADLINE_MS = 6000;

function reload() {
  window.location.reload();
}

/**
 * I show, beside a section's title, the most pressing thing the page
 * engine knows: that the device is offline, else that the login has
 * expired and changes wait for it to be renewed, else that a new version
 * is waiting. Once an offer is taken, I show it working, and reload the
 * page if it's still here by the deadline.
 */
export function PageStatus() {
  const { online, authorized, updateWaiting } = usePageStatus();
  const engine = usePageEngine();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!pending) return;
    const deadline = setTimeout(reload, RELOAD_DEADLINE_MS);
    return () => clearTimeout(deadline);
  }, [pending]);

  return (
    <>
      {/* Always present, so assistive tech hears the text arrive. */}
      <span role="status" className="flex shrink-0 items-center text-muted">
        {online ? null : (
          <span className="mx-xs text-danger">
            <OfflineIcon aria-hidden />
            <span className="sr-only">Offline</span>
          </span>
        )}
      </span>
      {online && !authorized ? (
        <ControlTooltip label={SIGN_IN_TIP} placement="right">
          <Button
            isIconOnly
            variant="danger"
            aria-label="Sign in again"
            isPending={pending}
            onPress={() => {
              setPending(true);
              void doLogin().catch(reload);
            }}
          >
            {({ isPending }) =>
              isPending ? (
                <Spinner color="current" size="sm" />
              ) : (
                <SignedOutIcon aria-hidden />
              )
            }
          </Button>
        </ControlTooltip>
      ) : null}
      {online && authorized && updateWaiting ? (
        <ControlTooltip label={UPDATE_TIP} placement="right">
          <Button
            isIconOnly
            variant="tertiary"
            aria-label="Update available"
            isPending={pending}
            onPress={() => {
              setPending(true);
              engine.update();
            }}
          >
            {({ isPending }) =>
              isPending ? (
                <Spinner color="current" size="sm" />
              ) : (
                <UpdateIcon aria-hidden />
              )
            }
          </Button>
        </ControlTooltip>
      ) : null}
    </>
  );
}
