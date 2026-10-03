import { ApolloClient, DocumentNode, gql } from "@apollo/client";
import { print } from "@apollo/client/utilities";
import { AssignBucketResultFragmentDoc } from "./__generated__/assignBucketResult.generated";
import { PlanItemResultFragmentDoc } from "./__generated__/planItemResult.generated";
import { SetStatusResultFragmentDoc } from "./__generated__/setStatusResult.generated";
import { ChangeSender, SentChange } from "./queue";

type Field = {
  /** Each variable's declaration, by name. */
  readonly declarations: Record<string, string>;
  readonly values: Record<string, unknown>;
  readonly selection: string;
  readonly fragment: DocumentNode;
};

/** I give one change's aliased field, suffixing its variables with i. */
function fieldFor(change: SentChange, i: number): Field {
  switch (change.kind) {
    case "status":
      return {
        declarations: { [`id${i}`]: "ID!", [`status${i}`]: "PlanItemStatus!" },
        values: { [`id${i}`]: change.id, [`status${i}`]: change.status },
        selection:
          `setStatus(id: $id${i}, status: $status${i})` +
          ` { ...setStatusResult @unmask }`,
        fragment: SetStatusResultFragmentDoc,
      };
    case "rename":
      return {
        declarations: { [`id${i}`]: "ID!", [`name${i}`]: "String!" },
        values: { [`id${i}`]: change.id, [`name${i}`]: change.name },
        // A plan can be renamed too, so the result is only an interface.
        selection:
          `rename(id: $id${i}, name: $name${i})` +
          ` { id ... on PlanItem { ...planItemResult @unmask } }`,
        fragment: PlanItemResultFragmentDoc,
      };
    case "create":
      return {
        declarations: {
          [`parentId${i}`]: "ID!",
          [`afterId${i}`]: "ID",
          [`name${i}`]: "String!",
          ...(change.choice ? { [`choice${i}`]: "RecognitionChoice" } : {}),
        },
        values: {
          [`parentId${i}`]: change.parentId,
          [`afterId${i}`]: change.afterId,
          [`name${i}`]: change.name,
          ...(change.choice ? { [`choice${i}`]: change.choice } : {}),
        },
        selection:
          `createItem(parentId: $parentId${i}, afterId: $afterId${i},` +
          ` name: $name${i}${change.choice ? `, choice: $choice${i}` : ""}) { ...planItemResult @unmask }`,
        fragment: PlanItemResultFragmentDoc,
      };
    case "assignBucket":
      return {
        declarations: { [`id${i}`]: "ID!", [`bucketId${i}`]: "ID" },
        values: { [`id${i}`]: change.id, [`bucketId${i}`]: change.bucketId },
        selection:
          `assignBucket(id: $id${i}, bucketId: $bucketId${i})` +
          ` { ...assignBucketResult @unmask }`,
        fragment: AssignBucketResultFragmentDoc,
      };
  }
}

/** I print each named definition once, the first of any repeats. */
export function uniqueDefinitions(documents: readonly DocumentNode[]): string {
  const byName = new Map<string, string>();
  for (const definition of documents.flatMap((it) => it.definitions)) {
    const name = "name" in definition ? definition.name?.value : undefined;
    if (name !== undefined && !byName.has(name)) {
      byName.set(name, print(definition));
    }
  }
  return [...byName.values()].join("\n");
}

/**
 * I build a mutation making each change in a field of its own, aliased by
 * position. Codegen can't know how many there will be, or of what kind,
 * so only each field's selection comes from it.
 */
export function changeMutation(changes: readonly SentChange[]) {
  const fields = changes.map(fieldFor);
  const variables = fields
    .flatMap((it) => Object.entries(it.declarations))
    .map(([name, type]) => `$${name}: ${type}`)
    .join(", ");
  const selections = fields.map((it, i) => `s${i}: ${it.selection}`).join("\n");
  return gql(
    `mutation doChanges(${variables}) { planner { ${selections} } }\n` +
      uniqueDefinitions(fields.map((it) => it.fragment)),
  );
}

function variablesFor(changes: readonly SentChange[]) {
  return Object.assign({}, ...changes.map((it, i) => fieldFor(it, i).values));
}

/** I send a plan's changes as one mutation, one aliased field apiece. */
export function aliasedSender(client: ApolloClient): ChangeSender {
  return async (changes, { keepalive }) => {
    const { data } = await client.mutate<{
      planner: Record<string, { id: string } | null> | null;
    }>({
      mutation: changeMutation(changes),
      variables: variablesFor(changes),
      errorPolicy: "all",
      context: { fetchOptions: { keepalive } },
    });
    return changes.map((_, i) => data?.planner?.[`s${i}`]?.id ?? null);
  };
}
