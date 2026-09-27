import { ApolloClient, gql } from "@apollo/client";
import { print } from "@apollo/client/utilities";
import { SetStatusResultFragmentDoc } from "./__generated__/setStatusResult.generated";
import { StatusChange, StatusSender } from "./queue";

const RESULT = print(SetStatusResultFragmentDoc);

/**
 * I build a mutation setting each change's status in a field of its own,
 * aliased by position. Codegen can't know how many there will be, so
 * only each field's selection comes from it.
 */
export function statusMutation(count: number) {
  const indexes = [...Array(count).keys()];
  const variables = indexes
    .map((i) => `$id${i}: ID!, $status${i}: PlanItemStatus!`)
    .join(", ");
  const fields = indexes
    .map(
      (i) =>
        `s${i}: setStatus(id: $id${i}, status: $status${i}) {` +
        ` ...setStatusResult @unmask }`,
    )
    .join("\n");
  return gql(
    `mutation doSetStatuses(${variables}) { planner { ${fields} } }\n` + RESULT,
  );
}

function variablesFor(changes: readonly StatusChange[]) {
  return Object.fromEntries(
    changes.flatMap((change, i) => [
      [`id${i}`, change.id],
      [`status${i}`, change.status],
    ]),
  );
}

/** I send a plan's changes as one mutation, one aliased field apiece. */
export function aliasedSender(client: ApolloClient): StatusSender {
  return async (changes, { keepalive }) => {
    const { data } = await client.mutate<{
      planner: Record<string, unknown> | null;
    }>({
      mutation: statusMutation(changes.length),
      variables: variablesFor(changes),
      errorPolicy: "all",
      context: { fetchOptions: { keepalive } },
    });
    return changes.map((_, i) => data?.planner?.[`s${i}`] != null);
  };
}
