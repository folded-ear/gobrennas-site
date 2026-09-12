import { GetSidebarDocument } from "@/features/sidebar/__generated__/getSidebar.generated";
import { PlanNavLinkFragmentDoc } from "@/features/sidebar/__generated__/planNavLink.generated";
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
    query: GetSidebarDocument,
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
        fragment: PlanNavLinkFragmentDoc,
        id: `PlanItem:${PLAN_ID}`,
      }),
    ).toEqual({ __typename: "Plan", name: "Thanksgiving", color: "#F57F17" });
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
        fragment: PlanNavLinkFragmentDoc,
        id: `PlanItem:${PLAN_ID}`,
      }),
    ).toEqual({ __typename: "PlanItem" });
  });
});
