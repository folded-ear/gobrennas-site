import { PlanItemStatus } from "@/__generated__/graphql";
import { buildInMemoryCache } from "@/lib/apollo/build-in-memory-cache";
import { ApolloClient, ApolloLink, gql, Observable } from "@apollo/client";
import { LocalState } from "@apollo/client/local-state";
import { describe, expect, it } from "vitest";
import { fetchPlanChanges } from "./fetch";

const SEEDED = gql`
  query FetchTestPlans {
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
          children {
            id
          }
        }
      }
    }
  }
`;

const wholeItem = (
  id: string,
  name: string,
  status: PlanItemStatus,
  planId: string,
) => ({
  __typename: "PlanItem",
  id,
  name,
  status,
  notes: null,
  parent: { __typename: "Plan", id: planId },
  aggregate: null,
  preparation: null,
  ingredient: null,
  quantity: null,
  components: [],
  bucket: null,
  children: [],
});

function setup(answer: Record<string, unknown[]>) {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: SEEDED,
    data: {
      planner: {
        __typename: "PlannerQuery",
        plans: ["1", "2"].map((id) => ({
          __typename: "Plan",
          id,
          children: [{ __typename: "PlanItem", id: `${id}0` }],
          descendants: [
            {
              __typename: "PlanItem",
              id: `${id}0`,
              name: "Old",
              status: PlanItemStatus.NEEDED,
              children: [],
            },
          ],
        })),
      },
    },
  });
  const sent: Record<string, unknown>[] = [];
  const client = new ApolloClient({
    dataMasking: true,
    cache,
    localState: new LocalState(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          sent.push(operation.variables);
          observer.next({
            data: { planner: { __typename: "PlannerQuery", ...answer } },
          });
          observer.complete();
        }),
    ),
  });
  const shown = (planId: string) =>
    cache
      .readQuery<{
        planner: {
          plans: { id: string; descendants: { id: string; name: string }[] }[];
        };
      }>({ query: SEEDED })!
      .planner.plans.find((it) => it.id === planId)!
      .descendants.map((it) => `${it.id}:${it.name}`);
  return { client, sent, shown };
}

const planWith = (planId: string, rootIds: string[]) => ({
  __typename: "Plan",
  id: planId,
  name: "A plan",
  color: "#F57F17",
  notes: null,
  buckets: [],
  children: rootIds.map((id) => ({ __typename: "PlanItem", id })),
});

describe("fetchPlanChanges", () => {
  it("asks for each plan from its own cutoff, in one request", async () => {
    const { client, sent } = setup({ p0: [], p1: [] });

    await fetchPlanChanges(client, [
      { planId: "1", cutoff: 1000 },
      { planId: "2", cutoff: 2000 },
    ]);

    expect(sent).toEqual([
      { planId0: "1", cutoff0: 1000, planId1: "2", cutoff1: 2000 },
    ]);
  });

  it("merges each plan's changes into that plan", async () => {
    const { client, shown } = setup({
      p0: [wholeItem("10", "Renamed", PlanItemStatus.NEEDED, "1")],
      p1: [
        planWith("2", []),
        wholeItem("20", "Gone", PlanItemStatus.COMPLETED, "2"),
      ],
    });

    await fetchPlanChanges(client, [
      { planId: "1", cutoff: 0 },
      { planId: "2", cutoff: 0 },
    ]);

    expect(shown("1")).toEqual(["10:Renamed"]);
    expect(shown("2")).toEqual([]);
  });
});
