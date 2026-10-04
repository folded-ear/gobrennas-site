"use client";

import { useSyncExternalStore } from "react";

const FORMAT: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

const noSubscription = () => () => {};

/** I give when the running build was made, if its id says. */
function builtAt(): Date | null {
  const time = Number(process.env.NEXT_PUBLIC_BUILD_ID);
  return process.env.NEXT_PUBLIC_BUILD_ID && Number.isFinite(time)
    ? new Date(time)
    : null;
}

/**
 * I say when the running build was made, in the viewer's own time zone, so
 * I show only once mounted in the browser.
 */
export function BuildTime() {
  const mounted = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const built = builtAt();
  if (!mounted || built === null) return null;
  return (
    <p className="text-sm text-muted">
      Built{" "}
      <time dateTime={built.toISOString()}>
        {built.toLocaleString(undefined, FORMAT)}
      </time>
    </p>
  );
}
