import { PlanItemStatus } from "@/__generated__/graphql";
import { MockLink } from "@apollo/client/testing";
import { changeMutation } from "../send";

/** I answer one status request, saving every change it carries. */
export function savedStatuses(
  changes: readonly { readonly id: string; readonly status: PlanItemStatus }[],
  { delay = 0 } = {},
): MockLink.MockedResponse {
  return {
    request: {
      query: changeMutation(
        changes.map((it) => ({
          kind: "status" as const,
          id: it.id,
          planId: "",
          name: "",
          status: it.status,
        })),
      ),
      variables: Object.fromEntries(
        changes.flatMap((it, i) => [
          [`id${i}`, it.id],
          [`status${i}`, it.status],
        ]),
      ),
    },
    result: {
      data: {
        planner: {
          __typename: "PlannerMutation",
          ...Object.fromEntries(
            changes.map((it, i) => [
              `s${i}`,
              { __typename: "PlanItem", id: it.id, status: it.status },
            ]),
          ),
        },
      },
    },
    delay,
  };
}
