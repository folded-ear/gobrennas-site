"use client";

import { usePreference } from "@/hooks/use-preference";
import { useSetPreference } from "@/hooks/use-set-preference";
import { diffDays, localDate } from "@/lib/dates";
import { parseLocalDate, PREF_GEOLOCATION_REFUSED_AT } from "@/lib/preferences";
import { Alert, Button, CloseButton } from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { noteGranted } from "./granted-this-load";

/** How long a refusal keeps me quiet. */
export const REFUSAL_QUIET_DAYS = 90;

type GeolocationPromptProps = {
  /** The page's geolocation permission, or null when it can't be told. */
  readonly permission: PermissionState | null;
};

/**
 * I offer to use the device's location while the browser would ask, unless
 * the user turned it down within the last REFUSAL_QUIET_DAYS. Turning it
 * down, here or in the browser, I record as refused today.
 */
export function GeolocationPrompt({ permission }: GeolocationPromptProps) {
  const refusedAt = parseLocalDate(usePreference(PREF_GEOLOCATION_REFUSED_AT));
  const [setRefusedAt] = useSetPreference(PREF_GEOLOCATION_REFUSED_AT);
  const [dismissed, setDismissed] = useState(false);
  // What I last saved, as a save in flight isn't yet in refusedAt.
  const saved = useRef<string | null>(null);
  const recordRefusal = useCallback(() => {
    const today = localDate();
    if (refusedAt === today || saved.current === today) return;
    saved.current = today;
    void setRefusedAt(today);
  }, [refusedAt, setRefusedAt]);
  const refuse = () => {
    setDismissed(true);
    recordRefusal();
  };

  const previous = useRef(permission);
  useEffect(() => {
    const was = previous.current;
    previous.current = permission;
    if (permission === "denied" && was !== null && was !== "denied") {
      recordRefusal();
    }
  }, [permission, recordRefusal]);

  const quiet =
    refusedAt !== null &&
    diffDays(refusedAt, localDate()) <= REFUSAL_QUIET_DAYS;
  if (permission !== "prompt" || dismissed || quiet) return null;

  const ask = () =>
    navigator.geolocation.getCurrentPosition(
      noteGranted,
      (error) => {
        if (error.code === error.PERMISSION_DENIED) refuse();
      },
      { enableHighAccuracy: false },
    );

  return (
    <Alert className="mb-md">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>
          Automatically order your list for the store you’re at?
        </Alert.Title>
      </Alert.Content>
      <Button size="sm" variant="primary" onPress={ask}>
        Use location
      </Button>
      <CloseButton aria-label="Dismiss" onPress={refuse} />
    </Alert>
  );
}
