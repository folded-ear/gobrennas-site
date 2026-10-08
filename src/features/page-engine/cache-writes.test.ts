import { PlanItemStatus } from "@/__generated__/graphql";
import { gql } from "@apollo/client";
import { beforeEach, describe, expect, it } from "vitest";
import { evictDraft, writeDraft, writeSaved } from "./cache-writes";
import type { CreateChange } from "./state";
import { childIdsOf, seededCache, THANKSGIVING } from "./test/status-cache";

const ITEM = gql`
  fragment CacheWritesTestItem on PlanItem {
    id
    name
    parent {
      id
    }
    children {
      id
    }
  }
`;

const BUCKET = gql`
  fragment CacheWritesTestBucket on PlanItem {
    id
    bucket {
      id
    }
  }
`;

const PANTRY_ITEM = gql`
  fragment CacheWritesTestPantryItem on PantryItem {
    id
    storeOrder
  }
`;

type Item = {
  id: string;
  name: string;
  parent: { id: string } | null;
  children: { id: string }[];
};

let cache: ReturnType<typeof seededCache>;

const read = (id: string) =>
  cache.readFragment<Item>({ fragment: ITEM, id: `PlanItem:${id}` });

const bucketOf = (id: string) =>
  cache.readFragment<{ bucket: { id: string } | null }>({
    fragment: BUCKET,
    id: `PlanItem:${id}`,
  })?.bucket;

const whole = (id: string, name: string, parent: object) => ({
  __typename: "PlanItem",
  id,
  name,
  status: PlanItemStatus.NEEDED,
  notes: null,
  parent,
  aggregate: null,
  preparation: null,
  ingredient: null,
  quantity: null,
  components: [],
  bucket: null,
  children: [],
});

const PLAN_PARENT = { __typename: "Plan", id: THANKSGIVING };

const STUFFING: CreateChange = {
  kind: "create",
  id: "draft:s",
  planId: THANKSGIVING,
  parentId: THANKSGIVING,
  afterId: "1",
  name: "Stuffing",
  bucketId: "b1",
};

beforeEach(() => {
  cache = seededCache();
});

describe("drafts", () => {
  it("writes a draft as an item under its parent, and evicts it", () => {
    writeDraft(cache, STUFFING);
    expect(read("draft:s")).toMatchObject({
      name: "Stuffing",
      parent: { id: THANKSGIVING },
    });
    expect(bucketOf("draft:s")?.id).toBe("b1");

    evictDraft(cache, "draft:s");
    expect(read("draft:s")).toBeNull();
  });
});

describe("writeSaved", () => {
  it("evicts a completed item with everything under it", () => {
    writeSaved(
      cache,
      [
        {
          kind: "status",
          id: "1",
          planId: THANKSGIVING,
          name: "Pumpkin pie",
          status: PlanItemStatus.COMPLETED,
        },
      ],
      {
        planner: {
          s0: {
            __typename: "PlanItem",
            id: "1",
            status: PlanItemStatus.COMPLETED,
          },
        },
      },
    );

    expect(read("1")).toBeNull();
    expect(read("2")).toBeNull();
    expect(childIdsOf(cache, THANKSGIVING)).toEqual(["3"]);
  });

  it("lists a created item after its sibling", () => {
    const { bucketId: _, ...sent } = STUFFING;
    const saved = whole("900", "Stuffing", PLAN_PARENT);
    // Apollo writes the saved item itself.
    cache.writeFragment({ fragment: ITEM, data: saved });

    writeSaved(cache, [sent], { planner: { s0: saved } });

    expect(childIdsOf(cache, THANKSGIVING)).toEqual(["1", "900", "3"]);
  });

  it("moves items as the server ordered them", () => {
    writeSaved(
      cache,
      [
        {
          kind: "move",
          ids: ["2"],
          planId: THANKSGIVING,
          parentId: "3",
          afterId: null,
          name: "Pumpkin",
        },
      ],
      {
        planner: {
          s0: { __typename: "PlanItem", children: [{ id: "2" }] },
        },
      },
    );

    expect(read("3")?.children.map((it) => it.id)).toEqual(["2"]);
    expect(read("2")?.parent?.id).toBe("3");
    expect(read("1")?.children).toEqual([]);
  });

  it("writes the store orders a saved store move showed", () => {
    const storeOrderOf = (id: string) =>
      cache.readFragment<{ storeOrder: number }>({
        fragment: PANTRY_ITEM,
        id: cache.identify({ __typename: "PantryItem", id }),
      })?.storeOrder;
    for (const [id, storeOrder] of [
      ["p1", 0],
      ["p2", 30],
    ] as const) {
      cache.writeFragment({
        fragment: PANTRY_ITEM,
        data: { __typename: "PantryItem", id, storeOrder },
      });
    }

    writeSaved(
      cache,
      [
        {
          kind: "storeOrder",
          id: "p2",
          targetId: "p1",
          after: true,
          name: "sugar",
          storeOrders: { p1: 1 / 3, p2: 2 / 3 },
        },
      ],
      { pantry: { s0: { __typename: "PantryItem", id: "p2" } } },
    );

    expect(storeOrderOf("p1")).toBe(1 / 3);
    expect(storeOrderOf("p2")).toBe(2 / 3);
  });
});
