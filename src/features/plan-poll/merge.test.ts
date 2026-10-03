import { PlanItemStatus } from "@/__generated__/graphql";
import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { gql } from "@apollo/client";
import { describe, expect, it } from "vitest";
import { mergePoll, PolledNode } from "./merge";

const PLAN = "10";
const OTHER_PLAN = "11";

const SEEDED = gql`
  query PollTestPlans {
    planner {
      plans {
        id
        name
        children {
          id
        }
        descendants {
          id
          name
          status
          children {
            id
          }
        }
      }
    }
  }
`;

type Seed = { id: string; name: string; children?: string[] };

const asItem = (it: Seed) => ({
  __typename: "PlanItem",
  id: it.id,
  name: it.name,
  status: "NEEDED",
  children: (it.children ?? []).map((id) => ({ __typename: "PlanItem", id })),
});

/** A plan holding the given items, whose roots are listed in order. */
function cacheWith(roots: string[], items: Seed[]) {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: SEEDED,
    data: {
      planner: {
        __typename: "PlannerQuery",
        plans: [
          {
            __typename: "Plan",
            id: PLAN,
            name: "Thanksgiving",
            children: roots.map((id) => ({ __typename: "PlanItem", id })),
            descendants: items.map(asItem),
          },
          {
            __typename: "Plan",
            id: OTHER_PLAN,
            name: "Picnic",
            children: [],
            descendants: [],
          },
        ],
      },
    },
  });
  return cache;
}

/** What the plan's queries show of it now. */
function shown(cache: ReturnType<typeof buildInMemoryCache>) {
  const data = cache.readQuery<{
    planner: {
      plans: {
        id: string;
        name: string;
        children: { id: string }[];
        descendants: { id: string; name: string; status: string }[];
      }[];
    };
  }>({ query: SEEDED });
  const plan = data!.planner.plans.find((it) => it.id === PLAN)!;
  return {
    name: plan.name,
    roots: plan.children.map((it) => it.id),
    items: plan.descendants.map((it) => [it.id, it.name, it.status]),
  };
}

const polledItem = (
  id: string,
  over: Partial<{
    name: string;
    status: PlanItemStatus;
    children: string[];
  }> = {},
): PolledNode => ({
  __typename: "PlanItem",
  id,
  name: over.name ?? `Item ${id}`,
  status: over.status ?? PlanItemStatus.NEEDED,
  notes: null,
  parent: null,
  aggregate: null,
  preparation: null,
  ingredient: null,
  quantity: null,
  components: [],
  bucket: null,
  children: (over.children ?? []).map((child) => ({
    __typename: "PlanItem" as const,
    id: child,
  })),
});

const polledPlan = (roots: string[], name = "Thanksgiving"): PolledNode => ({
  __typename: "Plan",
  id: PLAN,
  name,
  color: "#F57F17",
  notes: null,
  buckets: [],
  children: roots.map((id) => ({ __typename: "PlanItem" as const, id })),
});

describe("mergePoll", () => {
  it("updates an item another user changed", () => {
    const cache = cacheWith(["1"], [{ id: "1", name: "Pie" }]);

    mergePoll(cache, PLAN, [polledItem("1", { name: "Pumpkin pie" })]);

    expect(shown(cache).items).toEqual([["1", "Pumpkin pie", "NEEDED"]]);
  });

  it("lists a new item once its parent lists it", () => {
    const cache = cacheWith(["1"], [{ id: "1", name: "Pie" }]);

    mergePoll(cache, PLAN, [
      polledItem("1", { name: "Pie", children: ["2"] }),
      polledItem("2", { name: "Pumpkin" }),
    ]);

    expect(shown(cache).items).toEqual([
      ["1", "Pie", "NEEDED"],
      ["2", "Pumpkin", "NEEDED"],
    ]);
  });

  it("lists a new top-level item when the plan lists it", () => {
    const cache = cacheWith(["1"], [{ id: "1", name: "Pie" }]);

    mergePoll(cache, PLAN, [polledPlan(["1", "3"]), polledItem("3")]);

    expect(shown(cache).roots).toEqual(["1", "3"]);
    expect(shown(cache).items.map(([id]) => id)).toEqual(["1", "3"]);
  });

  it("drops a completed item and everything below it", () => {
    const cache = cacheWith(
      ["1", "4"],
      [
        { id: "1", name: "Pie", children: ["2"] },
        { id: "2", name: "Pumpkin" },
        { id: "4", name: "Salad" },
      ],
    );

    mergePoll(cache, PLAN, [
      polledPlan(["4"]),
      polledItem("1", { status: PlanItemStatus.COMPLETED, children: ["2"] }),
    ]);

    expect(shown(cache).items.map(([id]) => id)).toEqual(["4"]);
    expect(shown(cache).roots).toEqual(["4"]);
  });

  it("drops a deleted item", () => {
    const cache = cacheWith(
      ["1", "4"],
      [
        { id: "1", name: "Pie" },
        { id: "4", name: "Salad" },
      ],
    );

    mergePoll(cache, PLAN, [
      polledPlan(["1"]),
      polledItem("4", { status: PlanItemStatus.DELETED }),
    ]);

    expect(shown(cache).items.map(([id]) => id)).toEqual(["1"]);
  });

  it("keeps a trashed item that came back as needed out of the lists", () => {
    const cache = cacheWith(["1"], [{ id: "1", name: "Pie" }]);

    mergePoll(cache, PLAN, [polledItem("9", { name: "Revived" })]);

    expect(shown(cache).items.map(([id]) => id)).toEqual(["1"]);
  });

  it("takes a changed plan's own fields", () => {
    const cache = cacheWith(["1"], [{ id: "1", name: "Pie" }]);

    mergePoll(cache, PLAN, [polledPlan(["1"], "Friendsgiving")]);

    expect(shown(cache).name).toBe("Friendsgiving");
  });

  it("is harmless to apply twice", () => {
    const cache = cacheWith(["1"], [{ id: "1", name: "Pie" }]);
    const results = [polledPlan(["1", "3"]), polledItem("3")];

    mergePoll(cache, PLAN, results);
    const once = shown(cache);
    mergePoll(cache, PLAN, results);

    expect(shown(cache)).toEqual(once);
  });
});
