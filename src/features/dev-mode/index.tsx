"use client";

import { useDevMode } from "@/hooks/use-dev-mode";
import { useSetPreference } from "@/hooks/use-set-preference";
import { PREF_DEV_MODE, formatBoolean } from "@/lib/preferences";
import { Switch } from "@heroui/react";
import { PropsWithChildren } from "react";

/** I turn dev mode on and off for this device. */
export function DevModeSwitch() {
  const devMode = useDevMode();
  const [setDevMode] = useSetPreference(PREF_DEV_MODE);
  return (
    <Switch
      isSelected={devMode}
      onChange={(on) => void setDevMode(formatBoolean(on))}
    >
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        Dev Mode
      </Switch.Content>
    </Switch>
  );
}

/** I show my children only while this device has dev mode on. */
export function DevModeOnly({ children }: PropsWithChildren) {
  return useDevMode() ? children : null;
}
