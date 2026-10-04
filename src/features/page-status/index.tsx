"use client";

import { OfflineIcon, SignInIcon, UpdateIcon } from "@/components/icons";
import { doLogin } from "@/constants";
import { usePageEngine, usePageStatus } from "@/features/page-engine";
import { Button } from "@heroui/react";

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
        <Button
          isIconOnly
          size="sm"
          variant="tertiary"
          aria-label="Sign in again"
          onPress={() => void doLogin()}
        >
          <SignInIcon size="small" aria-hidden />
        </Button>
      )}
      {updateWaiting ? (
        <Button
          isIconOnly
          size="sm"
          variant="tertiary"
          aria-label="Update available"
          onPress={engine.update}
        >
          <UpdateIcon size="small" aria-hidden />
        </Button>
      ) : null}
    </>
  );
}
