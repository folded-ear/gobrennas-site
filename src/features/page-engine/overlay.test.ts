import { PlanItemStatus } from "@/__generated__/graphql";
import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { gql } from "@apollo/client";
import { beforeEach, describe, expect, it } from "vitest";
import { writeDraft } from "./cache-writes";
import { publishView } from "./overlay";
import type { Change, Pending, Phase } from "./state";
import { buildView, EMPTY_VIEW } from "./view";

const PLAN = "7";

const PLANS = gql`
  query OverlayTestPlans {
    planner {
      plans {
        id
        children {
          id
        }
        descendants {
          id
          name
          status
          pendingStatus @client
          inert @client
          ingredient {
            id
          }
          bucket {
            id
          }
          parent {
            id
          }
          children {
            id
          }
        }
      }
    }
  }
`;

type Item = {
  id: string;
  name: string;
  status: PlanItemStatus;
  pendingStatus: PlanItemStatus | null;
  inert: boolean;
  ingredient: { id: string } | null;
  bucket: { id: string } | null;
  parent: { id: string };
  children: { id: string }[];
};

type Plans = {
  planner: {
    plans: { id: string; children: { id: string }[]; descendants: Item[] }[];
  };
};

const item = (
  id: string,
  name: string,
  parent: { __typename: string; id: string },
  children: string[] = [],
) => ({
  __typename: "PlanItem",
  id,
  name,
  status: PlanItemStatus.NEEDED,
  ingredient: { __typename: "PantryItem", id: `i${id}` },
  bucket: null,
  parent,
  children: children.map((it) => ({ __typename: "PlanItem", id: it })),
});

let cache: ReturnType<typeof buildInMemoryCache>;

beforeEach(() => {
  cache = buildInMemoryCache();
  const plan = { __typename: "Plan", id: PLAN };
  const pie = { __typename: "PlanItem", id: "1" };
  cache.writeQuery({
    query: PLANS,
    data: {
      planner: {
        __typename: "PlannerQuery",
        plans: [
          {
            ...plan,
            children: [
              { __typename: "PlanItem", id: "1" },
              { __typename: "PlanItem", id: "3" },
            ],
            descendants: [
              item("1", "Pumpkin pie", plan, ["2"]),
              item("2", "Pumpkin", pie),
              item("3", "Whipped cream", plan),
            ],
          },
        ],
      },
    },
  });
});

const PANTRY_ITEM = gql`
  fragment OverlayTestPantryItem on PantryItem {
    id
    storeOrder
  }
`;

let seq = 0;
const show = (...changes: (Change | [Change, Phase])[]) =>
  publishView(
    cache,
    buildView(
      changes.map((it): Pending => {
        const [change, phase] = Array.isArray(it) ? it : [it, "ready" as const];
        return { key: `k${++seq}`, seq, change, phase, kept: "kept" };
      }),
    ),
  );

const plan = () => cache.readQuery<Plans>({ query: PLANS })!.planner.plans[0];
const itemOf = (id: string) => plan().descendants.find((it) => it.id === id);
const ids = (list: { id: string }[]) => list.map((it) => it.id);

describe("the overlay", () => {
  it("shows a new name, and what it parses to as unknown", () => {
    show({ kind: "rename", id: "3", planId: PLAN, name: "Ice cream" });

    expect(itemOf("3")).toMatchObject({ name: "Ice cream", ingredient: null });
  });

  it("shows the server's data again once the change is gone", () => {
    show({ kind: "rename", id: "3", planId: PLAN, name: "Ice cream" });

    publishView(cache, EMPTY_VIEW);

    expect(itemOf("3")).toMatchObject({
      name: "Whipped cream",
      ingredient: { id: "i3" },
    });
  });

  it("shows a held removal as pending, its subtree as inert", () => {
    show([
      {
        kind: "status",
        id: "1",
        planId: PLAN,
        name: "Pumpkin pie",
        status: PlanItemStatus.COMPLETED,
      },
      "held",
    ]);

    expect(itemOf("1")?.pendingStatus).toBe(PlanItemStatus.COMPLETED);
    expect(itemOf("2")?.inert).toBe(true);
  });

  it("takes a removed item and its subtree out of every list", () => {
    show({
      kind: "status",
      id: "1",
      planId: PLAN,
      name: "Pumpkin pie",
      status: PlanItemStatus.DELETED,
    });

    expect(ids(plan().children)).toEqual(["3"]);
    expect(ids(plan().descendants)).toEqual(["3"]);
  });

  it("lists a created item where it goes", () => {
    const stuffing: Change = {
      kind: "create",
      id: "draft:s",
      planId: PLAN,
      parentId: PLAN,
      afterId: "1",
      name: "Stuffing",
    };
    writeDraft(cache, stuffing);

    show(stuffing);

    expect(ids(plan().children)).toEqual(["1", "draft:s", "3"]);
    expect(itemOf("draft:s")?.name).toBe("Stuffing");
  });

  it("shows a moved item under its new parent", () => {
    show({
      kind: "move",
      ids: ["2"],
      planId: PLAN,
      parentId: "3",
      afterId: null,
      name: "Pumpkin",
    });

    expect(ids(itemOf("1")!.children)).toEqual([]);
    expect(ids(itemOf("3")!.children)).toEqual(["2"]);
    expect(itemOf("2")?.parent.id).toBe("3");
  });

  it("shows a status and a bucket", () => {
    cache.writeFragment({
      fragment: gql`
        fragment OverlayTestBucket on PlanBucket {
          id
        }
      `,
      data: { __typename: "PlanBucket", id: "b1" },
    });

    show(
      {
        kind: "status",
        id: "3",
        planId: PLAN,
        name: "Whipped cream",
        status: PlanItemStatus.ACQUIRED,
      },
      {
        kind: "assignBucket",
        id: "3",
        planId: PLAN,
        name: "Whipped cream",
        bucketId: "b1",
      },
    );

    expect(itemOf("3")).toMatchObject({
      status: PlanItemStatus.ACQUIRED,
      bucket: { id: "b1" },
    });
  });

  it("tells watchers when a view is published", () => {
    const seen: string[] = [];
    cache.watch<Plans>({
      query: PLANS,
      optimistic: true,
      callback: ({ result }) => {
        const name = result?.planner?.plans?.[0]?.descendants?.find(
          (it) => it?.id === "3",
        )?.name;
        if (name) seen.push(name);
      },
    });

    show({ kind: "rename", id: "3", planId: PLAN, name: "Ice cream" });

    expect(seen).toContain("Ice cream");
  });

  it("shows a store move's orders, then the server's once it's gone", () => {
    const id = cache.identify({ __typename: "PantryItem", id: "p2" });
    cache.writeFragment({
      fragment: PANTRY_ITEM,
      id,
      data: { __typename: "PantryItem", id: "p2", storeOrder: 10 },
    });
    const storeOrder = () =>
      cache.readFragment<{ storeOrder: number }>({ fragment: PANTRY_ITEM, id })
        ?.storeOrder;

    show({
      kind: "storeOrder",
      id: "p2",
      targetId: "p1",
      after: true,
      name: "sugar",
      storeOrders: { p2: 20.5 },
    });

    expect(storeOrder()).toBe(20.5);

    publishView(cache, EMPTY_VIEW);

    expect(storeOrder()).toBe(10);
  });
});
