import { PlanItemStatus } from "@/__generated__/graphql";
import type { StatusChange } from "@/features/page-engine/state";
import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { describe, expect, it } from "vitest";
import { PositionDocument } from "./__generated__/position.generated";
import { StampedItemFragmentDoc } from "./__generated__/stampedItem.generated";
import { FRESH_MS, positionStamp } from "./use-position-stamper";

type Cache = ReturnType<typeof buildInMemoryCache>;

const NOW = Date.parse("2026-11-12T17:30:00.000Z");
const COORDS = { latitude: 45.523, longitude: -122.676, accuracy: 35 };

const SUGAR: StatusChange = {
  kind: "status",
  id: "31",
  planId: "7",
  name: "1 cup sugar",
  status: PlanItemStatus.ACQUIRED,
};

const NOTE: StatusChange = {
  ...SUGAR,
  id: "32",
  name: "Coupons are in the glovebox",
};

/** I seed sugar (with an ingredient) and a note (without one). */
function seededCache(): Cache {
  const cache = buildInMemoryCache();
  cache.writeFragment({
    fragment: StampedItemFragmentDoc,
    data: {
      __typename: "PlanItem",
      id: SUGAR.id,
      ingredient: { __typename: "PantryItem", id: "901" },
    },
  });
  cache.writeFragment({
    fragment: StampedItemFragmentDoc,
    data: { __typename: "PlanItem", id: NOTE.id, ingredient: null },
  });
  return cache;
}

function seedPosition(cache: Cache, ts: number) {
  cache.writeQuery({
    query: PositionDocument,
    data: { position: { __typename: "Position", ts, ...COORDS } },
  });
}

describe("positionStamp", () => {
  it("stamps an acquired ingredient with a fresh position, done now", () => {
    const cache = seededCache();
    seedPosition(cache, NOW - 20_000);

    expect(positionStamp(cache, SUGAR, NOW)).toEqual({
      doneAt: "2026-11-12T17:30:00.000Z",
      coords: COORDS,
    });
  });

  it("stamps with a position just shy of going stale", () => {
    const cache = seededCache();
    seedPosition(cache, NOW - FRESH_MS + 1);

    expect(positionStamp(cache, SUGAR, NOW)?.coords).toEqual(COORDS);
  });

  it("doesn't stamp with a stale position", () => {
    const cache = seededCache();
    seedPosition(cache, NOW - FRESH_MS);

    expect(positionStamp(cache, SUGAR, NOW)).toBeNull();
  });

  it("doesn't stamp without a position", () => {
    expect(positionStamp(seededCache(), SUGAR, NOW)).toBeNull();
  });

  it("doesn't stamp an ingredient marked needed", () => {
    const cache = seededCache();
    seedPosition(cache, NOW - 20_000);
    const needed = { ...SUGAR, status: PlanItemStatus.NEEDED };

    expect(positionStamp(cache, needed, NOW)).toBeNull();
  });

  it("doesn't stamp an item with no ingredient", () => {
    const cache = seededCache();
    seedPosition(cache, NOW - 20_000);

    expect(positionStamp(cache, NOTE, NOW)).toBeNull();
  });

  it("doesn't stamp an item it knows nothing of", () => {
    const cache = seededCache();
    seedPosition(cache, NOW - 20_000);

    expect(positionStamp(cache, { ...SUGAR, id: "99" }, NOW)).toBeNull();
  });
});
