"use client";

import { OfflineIcon, SignInIcon } from "@/components/icons";
import { doLogin } from "@/constants";
import { useSyncStatus } from "@/features/plan-sync";
import { Button } from "@heroui/react";

/**
 * I show, beside a section's title, what the page's sync engine knows: that
 * the device is offline, or that the login has expired and changes wait
 * for it to be renewed.
 */
export function SyncStatus() {
  const { online, authorized } = useSyncStatus();
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
    </>
  );
}
