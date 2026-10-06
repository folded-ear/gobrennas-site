"use client";

import { localDate } from "@/lib/dates";
import { useState } from "react";

/**
 * I am the viewer's local calendar date, fixed when my caller mounts. The
 * screen loads that caller client-side only (`ssr: false`), so I never run
 * where the local zone is unknown.
 */
export function useToday(): string {
  const [today] = useState(localDate);
  return today;
}
