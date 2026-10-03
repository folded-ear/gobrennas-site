import { PlanItemStatus } from "@/__generated__/graphql";
import { gql } from "@apollo/client";
import { beforeEach, describe, expect, it } from "vitest";
import {
  childIdsOf,
  readStatus,
  seededCache,
  THANKSGIVING,
} from "../plan-changes/test/status-cache";
import { evictDraft, writeDraft, writeSaved } from "./cache-writes";
import type { CreateChange } from "./state";

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
  it("writes a saved status", () => {
    writeSaved(
      cache,
      [
        {
          kind: "status",
          id: "3",
          planId: THANKSGIVING,
          name: "Whipped cream",
          status: PlanItemStatus.ACQUIRED,
        },
      ],
      {
        planner: {
          s0: {
            __typename: "PlanItem",
            id: "3",
            status: PlanItemStatus.ACQUIRED,
          },
        },
      },
    );

    expect(readStatus(cache, "3")?.status).toBe(PlanItemStatus.ACQUIRED);
  });

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

    writeSaved(cache, [sent], {
      planner: { s0: whole("900", "Stuffing", PLAN_PARENT) },
    });

    expect(childIdsOf(cache, THANKSGIVING)).toEqual(["1", "900", "3"]);
    expect(read("900")?.name).toBe("Stuffing");
  });

  it("writes a saved name and bucket", () => {
    writeSaved(
      cache,
      [
        { kind: "rename", id: "3", planId: THANKSGIVING, name: "Ice cream" },
        {
          kind: "assignBucket",
          id: "3",
          planId: THANKSGIVING,
          name: "Ice cream",
          bucketId: "b1",
        },
      ],
      {
        planner: {
          s0: whole("3", "Ice cream", PLAN_PARENT),
          s1: {
            __typename: "PlanItem",
            id: "3",
            bucket: { __typename: "PlanBucket", id: "b1" },
          },
        },
      },
    );

    expect(read("3")?.name).toBe("Ice cream");
    expect(bucketOf("3")?.id).toBe("b1");
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
});
