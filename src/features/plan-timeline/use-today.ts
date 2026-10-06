"use client";

import { localDate } from "@/lib/dates";
import { useEffect, useState } from "react";

/** How often I look to see whether the date has changed. */
export const TODAY_CHECK_INTERVAL_MS = 60 * 1000;

/**
 * I am the viewer's local calendar date, read when my caller mounts and
 * again every so often, so I move on once the day does. The screen loads
 * that caller client-side only (`ssr: false`), so I never run where the
 * local zone is unknown.
 */
export function useToday(): string {
  const [today, setToday] = useState(localDate);
  useEffect(() => {
    const id = setInterval(
      () => setToday(localDate()),
      TODAY_CHECK_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, []);
  return today;
}
