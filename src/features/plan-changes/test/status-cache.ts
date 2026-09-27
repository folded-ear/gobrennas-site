import { PlanItemStatus } from "@/__generated__/graphql";
import { PlanItemStatusFragmentDoc } from "@/features/plan-status/__generated__/planItemStatus.generated";
import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { gql } from "@apollo/client";
import { PlanItemStatusStateFragmentDoc } from "../__generated__/planItemStatusState.generated";

type Cache = ReturnType<typeof buildInMemoryCache>;

export const THANKSGIVING = "7";
export const PICNIC = "8";

const PLANS = gql`
  query StatusTestPlans {
    planner {
      plans {
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
            children {
              id
            }
          }
        }
      }
    }
  }
`;

function item(
  id: string,
  name: string,
  parent: { __typename: string; id: string },
) {
  return {
    __typename: "PlanItem",
    id,
    name,
    status: "NEEDED",
    parent,
  };
}

/**
 * I build a cache holding two plans: Thanksgiving, with a pumpkin pie
 * (1) needing a pumpkin (2), and whipped cream (3); and Picnic, with a
 * salad (4).
 */
export function seededCache(): Cache {
  const cache = buildInMemoryCache();
  const thanksgiving = { __typename: "Plan", id: THANKSGIVING };
  const picnic = { __typename: "Plan", id: PICNIC };
  const pie = item("1", "Pumpkin pie", thanksgiving);
  cache.writeQuery({
    query: PLANS,
    data: {
      planner: {
        __typename: "PlannerQuery",
        plans: [
          {
            ...thanksgiving,
            name: "Thanksgiving",
            children: [
              {
                ...pie,
                children: [
                  {
                    ...item("2", "Pumpkin", {
                      __typename: "PlanItem",
                      id: "1",
                    }),
                    children: [],
                  },
                ],
              },
              { ...item("3", "Whipped cream", thanksgiving), children: [] },
            ],
          },
          {
            ...picnic,
            name: "Picnic",
            children: [{ ...item("4", "Salad", picnic), children: [] }],
          },
        ],
      },
    },
  });
  return cache;
}

/** I read an item's status and status state, or null once it's gone. */
export function readStatus(cache: Cache, id: string) {
  return cache.readFragment({
    fragment: PlanItemStatusFragmentDoc,
    id: `PlanItem:${id}`,
  });
}

/** I read the ids of a plan's top-level items. */
export function childIdsOf(cache: Cache, planId: string): string[] {
  const plan = cache.readFragment<{ children: { id: string }[] }>({
    fragment: gql`
      fragment StatusTestPlanChildren on Plan {
        children {
          id
        }
      }
    `,
    id: `PlanItem:${planId}`,
  });
  return plan?.children.map((it) => it.id) ?? [];
}

/** I mark an item's removal as held, as the status queue would. */
export function markPending(
  cache: Cache,
  id: string,
  status: PlanItemStatus.COMPLETED | PlanItemStatus.DELETED,
) {
  cache.writeFragment({
    fragment: PlanItemStatusStateFragmentDoc,
    id: `PlanItem:${id}`,
    data: {
      __typename: "PlanItem",
      pendingStatus: status,
      savingStatus: false,
    },
  });
}
