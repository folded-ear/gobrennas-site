import { PlanItemStatus } from "@/__generated__/graphql";
import { MockLink } from "@apollo/client/testing";
import { changeMutation } from "../mutation";

/** I answer one status request, saving every change it carries. */
export function savedStatuses(
  changes: readonly { readonly id: string; readonly status: PlanItemStatus }[],
  { delay = 0 } = {},
): MockLink.MockedResponse {
  const { mutation, variables } = changeMutation(
    changes.map((it) => ({
      kind: "status" as const,
      id: it.id,
      planId: "",
      name: "",
      status: it.status,
    })),
  );
  return {
    request: { query: mutation, variables },
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
