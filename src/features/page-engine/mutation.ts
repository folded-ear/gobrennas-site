import { DocumentNode, gql } from "@apollo/client";
import { print } from "@apollo/client/utilities";
import { PlanItemFragmentDoc } from "../plan-item/__generated__/planItem.generated";
import { PlanItemTextFragmentDoc } from "../plan-item/__generated__/planItemText.generated";
import { TimelineItemFragmentDoc } from "../plan-timeline/__generated__/timelineItem.generated";
import { ShoppingPlanItemFragmentDoc } from "../shopping-list/__generated__/shoppingPlanItem.generated";
import { AssignBucketResultFragmentDoc } from "./__generated__/assignBucketResult.generated";
import { PlanItemResultFragmentDoc } from "./__generated__/planItemResult.generated";
import { PollPlanFragmentDoc } from "./__generated__/pollPlan.generated";
import { SetStatusResultFragmentDoc } from "./__generated__/setStatusResult.generated";
import { CHANGE_ROOTS, Root } from "./roots";
import type { PollRequest, SentChange } from "./state";

type Field = {
  readonly root: Root;
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
        root: "planner",
        declarations: {
          [`id${i}`]: "ID!",
          [`status${i}`]: "PlanItemStatus!",
          [`doneAt${i}`]: "DateTime",
        },
        values: {
          [`id${i}`]: change.id,
          [`status${i}`]: change.status,
          [`doneAt${i}`]: change.doneAt ?? null,
        },
        selection:
          `setStatus(id: $id${i}, status: $status${i}, doneAt: $doneAt${i})` +
          ` { ...setStatusResult }`,
        fragment: SetStatusResultFragmentDoc,
      };
    case "rename":
      return {
        root: "planner",
        declarations: { [`id${i}`]: "ID!", [`name${i}`]: "String!" },
        values: { [`id${i}`]: change.id, [`name${i}`]: change.name },
        // A plan can be renamed too, so the result is only an interface.
        selection:
          `rename(id: $id${i}, name: $name${i})` +
          ` { __typename id ... on PlanItem { ...planItemResult } }`,
        fragment: PlanItemResultFragmentDoc,
      };
    case "create":
      return {
        root: "planner",
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
          `) { __typename id ...planItemResult }`,
        fragment: PlanItemResultFragmentDoc,
      };
    case "assignBucket":
      return {
        root: "planner",
        declarations: { [`id${i}`]: "ID!", [`bucketId${i}`]: "ID" },
        values: { [`id${i}`]: change.id, [`bucketId${i}`]: change.bucketId },
        selection:
          `assignBucket(id: $id${i}, bucketId: $bucketId${i})` +
          ` { ...assignBucketResult }`,
        fragment: AssignBucketResultFragmentDoc,
      };
    case "move":
      return {
        root: "planner",
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
    case "storeOrder":
      return {
        root: "pantry",
        declarations: {
          [`id${i}`]: "ID!",
          [`targetId${i}`]: "ID!",
          [`after${i}`]: "Boolean!",
        },
        values: {
          [`id${i}`]: change.id,
          [`targetId${i}`]: change.targetId,
          [`after${i}`]: change.after,
        },
        // The server renumbers every pantry item, so its number for this
        // one alone would sort among stale ones; the change's own are kept.
        selection:
          `orderForStore(id: $id${i}, targetId: $targetId${i},` +
          ` after: $after${i}) { id }`,
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
 * position under its own root, with its variables. Codegen can't know how
 * many there will be, or of what kind, so only each field's selection
 * comes from it.
 */
export function changeMutation(changes: readonly SentChange[]) {
  const fields = changes.map(fieldFor);
  const declared = fields
    .flatMap((it) => Object.entries(it.declarations))
    .map(([name, type]) => `$${name}: ${type}`)
    .join(", ");
  const roots = CHANGE_ROOTS.flatMap((root) => {
    const selections = fields
      .map((it, i) => (it.root === root ? `s${i}: ${it.selection}` : null))
      .filter((it) => it !== null);
    return selections.length === 0
      ? []
      : [`${root} { ${selections.join("\n")} }`];
  });
  return {
    mutation: gql(
      `mutation doChanges(${declared}) { ${roots.join(" ")} }\n` +
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
        ` ...planItemText @unmask ...shoppingPlanItem @unmask }` +
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
          PlanItemTextFragmentDoc,
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
