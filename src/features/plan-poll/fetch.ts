import { ApolloClient, gql } from "@apollo/client";
import { uniqueDefinitions } from "../plan-changes/send";
import { PlanItemFragmentDoc } from "../plan-item/__generated__/planItem.generated";
import { TimelineItemFragmentDoc } from "../plan-timeline/__generated__/timelineItem.generated";
import { ShoppingPlanItemFragmentDoc } from "../shopping-list/__generated__/shoppingPlanItem.generated";
import { PollPlanFragmentDoc } from "./__generated__/pollPlan.generated";
import { mergePoll, PolledNode } from "./merge";
import { PollRequest } from "./poller";

/**
 * I build a query asking for each plan's changes in a field of its own,
 * aliased by position. Codegen can't know how many plans there will be,
 * so only the selections come from it. Fragments are unmasked so the
 * whole result lands in the cache and is merged as the server sent it.
 */
function pollQuery(requests: readonly PollRequest[]) {
  const variables = requests
    .map((_, i) => `$planId${i}: ID!, $cutoff${i}: Long!`)
    .join(", ");
  const fields = requests
    .map(
      (_, i) =>
        `p${i}: updatedSince(planId: $planId${i}, cutoff: $cutoff${i}) {` +
        ` __typename id` +
        ` ... on Plan { ...pollPlan @unmask }` +
        ` ... on PlanItem {` +
        ` ...timelineItem @unmask ...planItem @unmask` +
        ` ...shoppingPlanItem @unmask }` +
        ` }`,
    )
    .join("\n");
  return gql(
    `query pollPlans(${variables}) { planner { ${fields} } }\n` +
      uniqueDefinitions([
        PollPlanFragmentDoc,
        TimelineItemFragmentDoc,
        PlanItemFragmentDoc,
        ShoppingPlanItemFragmentDoc,
      ]),
  );
}

/** I fetch every request's plan changes and merge them into the cache. */
export async function fetchPlanChanges(
  client: ApolloClient,
  requests: readonly PollRequest[],
): Promise<void> {
  const { data, error } = await client.query<{
    planner: Record<string, PolledNode[]>;
  }>({
    query: pollQuery(requests),
    variables: Object.assign(
      {},
      ...requests.map(({ planId, cutoff }, i) => ({
        [`planId${i}`]: planId,
        [`cutoff${i}`]: cutoff,
      })),
    ),
    fetchPolicy: "no-cache",
  });
  if (error || !data) throw error ?? new Error("Poll returned no data");
  client.cache.batch({
    update: (cache) =>
      requests.forEach(({ planId }, i) =>
        mergePoll(cache, planId, data.planner[`p${i}`]),
      ),
  });
}
