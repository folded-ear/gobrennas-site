import { usePreference } from "@/hooks/use-preference";
import { PREF_DEV_MODE, parseBoolean } from "@/lib/preferences";

/** I say whether this device has dev mode on. */
export function useDevMode(): boolean {
  return parseBoolean(usePreference(PREF_DEV_MODE));
}
