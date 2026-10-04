"use client";

import { ControlTooltip } from "@/components/control-tooltip";
import { OfflineIcon, SignedOutIcon, UpdateIcon } from "@/components/icons";
import { doLogin } from "@/constants";
import { usePageEngine, usePageStatus } from "@/features/page-engine";
import { Button } from "@heroui/react";

export const SIGN_IN_TIP =
  "Your login has expired. Sign in again to save your changes.";
export const UPDATE_TIP = "A new version is ready. Tap to update.";

/**
 * I show, beside a section's title, what the page engine knows: that
 * the device is offline, that the login has expired and changes wait for
 * it to be renewed, or that a new version is waiting.
 */
export function PageStatus() {
  const { online, authorized, updateWaiting } = usePageStatus();
  const engine = usePageEngine();
  return (
    <>
      {/* Always present, so assistive tech hears the text arrive. */}
      <span role="status" className="flex shrink-0 items-center text-muted">
        {online ? null : (
          <>
            <OfflineIcon size="small" aria-hidden />
            <span className="sr-only">Offline</span>
          </>
        )}
      </span>
      {authorized ? null : (
        <ControlTooltip label={SIGN_IN_TIP} placement="right">
          <Button
            isIconOnly
            size="sm"
            variant="tertiary"
            aria-label="Sign in again"
            onPress={() => void doLogin()}
          >
            <SignedOutIcon size="small" aria-hidden />
          </Button>
        </ControlTooltip>
      )}
      {updateWaiting ? (
        <ControlTooltip label={UPDATE_TIP} placement="right">
          <Button
            isIconOnly
            size="sm"
            variant="tertiary"
            aria-label="Update available"
            onPress={engine.update}
          >
            <UpdateIcon size="small" aria-hidden />
          </Button>
        </ControlTooltip>
      ) : null}
    </>
  );
}
