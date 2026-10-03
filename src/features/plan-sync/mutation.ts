import { DocumentNode, gql } from "@apollo/client";
import { print } from "@apollo/client/utilities";
import { AssignBucketResultFragmentDoc } from "../plan-changes/__generated__/assignBucketResult.generated";
import { PlanItemResultFragmentDoc } from "../plan-changes/__generated__/planItemResult.generated";
import { SetStatusResultFragmentDoc } from "../plan-changes/__generated__/setStatusResult.generated";
import { PlanItemFragmentDoc } from "../plan-item/__generated__/planItem.generated";
import { PollPlanFragmentDoc } from "../plan-poll/__generated__/pollPlan.generated";
import { TimelineItemFragmentDoc } from "../plan-timeline/__generated__/timelineItem.generated";
import { ShoppingPlanItemFragmentDoc } from "../shopping-list/__generated__/shoppingPlanItem.generated";
import type { PollRequest, SentChange } from "./state";

type Field = {
  /** Each variable's declaration, by name. */
  readonly declarations: Record<string, string>;
  readonly values: Record<string, unknown>;
  readonly selection: string;
  /** What the selection spreads, if it spreads anything. */
  readonly fragment?: DocumentNode;
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
          ` { __typename id ... on PlanItem { ...planItemResult @unmask } }`,
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
          ` name: $name${i}` +
          (change.choice ? `, choice: $choice${i}` : "") +
          `) { ...planItemResult @unmask }`,
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
    case "move":
      return {
        declarations: { [`spec${i}`]: "MutatePlanTree!" },
        values: {
          [`spec${i}`]: {
            ids: change.ids,
            parentId: change.parentId,
            afterId: change.afterId,
          },
        },
        // No ids of parents: a parent may be a plan, and writing it back as
        // a PlanItem would retype it in the cache.
        selection: `mutateTree(spec: $spec${i}) { children { id } }`,
      };
  }
}

/** I print each named definition once, the first of any repeats. */
function uniqueDefinitions(documents: readonly DocumentNode[]): string {
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
 * position, with its variables. Codegen can't know how many there will be,
 * or of what kind, so only each field's selection comes from it.
 */
export function changeMutation(changes: readonly SentChange[]) {
  const fields = changes.map(fieldFor);
  const declared = fields
    .flatMap((it) => Object.entries(it.declarations))
    .map(([name, type]) => `$${name}: ${type}`)
    .join(", ");
  const selections = fields.map((it, i) => `s${i}: ${it.selection}`).join("\n");
  return {
    mutation: gql(
      `mutation doChanges(${declared}) { planner { ${selections} } }\n` +
        uniqueDefinitions(fields.flatMap((it) => it.fragment ?? [])),
    ),
    variables: Object.assign({}, ...fields.map((it) => it.values)),
  };
}

/**
 * I build a query asking for each plan's changes in a field of its own,
 * aliased by position, with its variables. Fragments are unmasked so the
 * whole result is written as the server sent it.
 */
export function pollQuery(requests: readonly PollRequest[]) {
  const declared = requests
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
  return {
    query: gql(
      `query pollPlans(${declared}) { planner { ${fields} } }\n` +
        uniqueDefinitions([
          PollPlanFragmentDoc,
          TimelineItemFragmentDoc,
          PlanItemFragmentDoc,
          ShoppingPlanItemFragmentDoc,
        ]),
    ),
    variables: Object.assign(
      {},
      ...requests.map(({ planId, cutoff }, i) => ({
        [`planId${i}`]: planId,
        [`cutoff${i}`]: cutoff,
      })),
    ),
  };
}
