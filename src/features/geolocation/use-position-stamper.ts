import { PlanItemStatus } from "@/__generated__/graphql";
import type {
  Stamp,
  Stamper,
  StatusChange,
} from "@/features/page-engine/state";
import { ApolloCache } from "@apollo/client";
import { useApolloClient } from "@apollo/client/react";
import { useCallback } from "react";
import { PositionDocument } from "./__generated__/position.generated";
import { StampedItemFragmentDoc } from "./__generated__/stampedItem.generated";

/** How long a position stays good enough to stamp an acquisition with. */
export const FRESH_MS = 10 * 60 * 1000;

/**
 * I stamp a change acquiring an ingredient, made at now, with the position
 * in the cache, so long as it's fresh. I give null for any other change.
 */
export function positionStamp(
  cache: ApolloCache,
  change: StatusChange,
  now: number,
): Stamp | null {
  if (change.status !== PlanItemStatus.ACQUIRED) return null;
  const item = cache.readFragment({
    fragment: StampedItemFragmentDoc,
    id: cache.identify({ __typename: "PlanItem", id: change.id }),
  });
  if (!item?.ingredient) return null;
  const position = cache.readQuery({ query: PositionDocument })?.position;
  if (!position || now - position.ts >= FRESH_MS) return null;
  const { latitude, longitude, accuracy } = position;
  return {
    doneAt: new Date(now).toISOString(),
    coords: { latitude, longitude, accuracy },
  };
}

/** I give a stamper that stamps ingredient acquisitions with a fresh position. */
export function usePositionStamper(): Stamper {
  const client = useApolloClient();
  return useCallback(
    (change, now) => positionStamp(client.cache, change, now),
    [client],
  );
}
