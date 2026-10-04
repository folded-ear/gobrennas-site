import { PlanItemStatus } from "@/__generated__/graphql";
import { publishView } from "@/features/page-engine/overlay";
import { buildView } from "@/features/page-engine/view";
import { PlanPickerPlanFragmentDoc } from "@/features/plan-picker/__generated__/planPickerPlan.generated";
import { PlanItemStatusFragmentDoc } from "@/features/plan-status/__generated__/planItemStatus.generated";
import { RecipesDocument } from "@/screens/__generated__/recipes.generated";
import { gql } from "@apollo/client";
import { describe, expect, it } from "vitest";
import { buildInMemoryCache } from "./build-in-memory-cache";

const PLAN_ID = "7";

// mutateTree as the legacy client selects it. The field is typed PlanItem!,
// so the server names the parent a PlanItem even when it is a plan.
const MUTATE_TREE = gql`
  mutation mutatePlanTree($spec: MutatePlanTree!) {
    planner {
      mutateTree(spec: $spec) {
        id
        name
        children {
          id
          name
        }
      }
    }
  }
`;

function seededWithPlan() {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: RecipesDocument,
    data: {
      planner: {
        __typename: "PlannerQuery",
        plans: [
          {
            __typename: "Plan",
            id: PLAN_ID,
            mine: true,
            name: "Thanksgiving",
            color: "#F57F17",
          },
        ],
      },
    },
  });
  return cache;
}

describe("buildInMemoryCache", () => {
  it("reads a plan as a plan", () => {
    const cache = seededWithPlan();

    expect(
      cache.readFragment({
        fragment: PlanPickerPlanFragmentDoc,
        id: `PlanItem:${PLAN_ID}`,
      }),
    ).toEqual({
      __typename: "Plan",
      id: PLAN_ID,
      name: "Thanksgiving",
      color: "#F57F17",
      mine: true,
    });
  });

  // Plans and items share a key, so a response that names a plan a
  // PlanItem retypes it, and fragments on Plan read it as empty. This is
  // why doMutateTree.gql never selects a parent.
  it("retypes a plan when a response names it a PlanItem", () => {
    const cache = seededWithPlan();

    // How Apollo writes a mutation's result (QueryManager.markMutationResult).
    cache.write({
      dataId: "ROOT_MUTATION",
      query: MUTATE_TREE,
      variables: { spec: { ids: ["6"], parentId: PLAN_ID, afterId: null } },
      result: {
        planner: {
          __typename: "PlannerMutation",
          mutateTree: {
            __typename: "PlanItem",
            id: PLAN_ID,
            name: "Thanksgiving",
            children: [
              { __typename: "PlanItem", id: "6", name: "Breakfast" },
              { __typename: "PlanItem", id: "1", name: "Thanksgiving dinner" },
            ],
          },
        },
      },
    });

    expect(
      cache.readFragment({
        fragment: PlanPickerPlanFragmentDoc,
        id: `PlanItem:${PLAN_ID}`,
      }),
    ).toEqual({ __typename: "PlanItem" });
  });
});

// A plan holding a recipe, holding an ingredient, as the planner reads them.
const PIE_TREE = gql`
  query PieTree {
    planner {
      plan(id: "7") {
        id
        name
        children {
          id
          name
          status
          parent {
            id
          }
          children {
            id
            name
            status
            parent {
              id
            }
          }
        }
      }
    }
  }
`;

function seededWithPie() {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: PIE_TREE,
    data: {
      planner: {
        __typename: "PlannerQuery",
        plan: {
          __typename: "Plan",
          id: PLAN_ID,
          name: "Thanksgiving",
          children: [
            {
              __typename: "PlanItem",
              id: "1",
              name: "Pumpkin pie",
              status: "NEEDED",
              parent: { __typename: "Plan", id: PLAN_ID },
              children: [
                {
                  __typename: "PlanItem",
                  id: "2",
                  name: "Pumpkin",
                  status: "NEEDED",
                  parent: { __typename: "PlanItem", id: "1" },
                },
              ],
            },
          ],
        },
      },
    },
  });
  return cache;
}

function readStatus(cache: ReturnType<typeof buildInMemoryCache>, id: string) {
  return cache.readFragment({
    fragment: PlanItemStatusFragmentDoc,
    id: `PlanItem:${id}`,
  });
}

describe("plan item status state", () => {
  it("reads an item nobody has touched as settled", () => {
    const cache = seededWithPie();

    expect(readStatus(cache, "2")).toMatchObject({
      pendingStatus: null,
      inert: false,
    });
  });

  it("makes an item inert while an ancestor's status is pending", () => {
    const cache = seededWithPie();

    publishView(
      cache,
      buildView([
        {
          key: "k1",
          seq: 1,
          phase: "held",
          kept: "kept",
          change: {
            kind: "status",
            id: "1",
            planId: PLAN_ID,
            name: "Pumpkin pie",
            status: PlanItemStatus.DELETED,
          },
        },
      ]),
    );

    expect(readStatus(cache, "2")?.inert).toBe(true);
    // the item itself stays live, so its change can be cancelled
    expect(readStatus(cache, "1")).toMatchObject({
      pendingStatus: "DELETED",
      inert: false,
    });
  });
});
