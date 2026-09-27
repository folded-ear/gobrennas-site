import {
  changeApiClient,
  ChangeRequest,
} from "@/features/plan-changes/test/change-api";
import {
  seededCache,
  THANKSGIVING,
} from "@/features/plan-changes/test/status-cache";
import { buildPlanTree } from "@/features/plan-dnd/moves";
import { PlanItemNode } from "@/features/plan-timeline/model";
import { render } from "@/test";
import { ApolloProvider } from "@apollo/client/react";
import { DraftRow } from "../draft-row";
import { buildEntries, TreeEntry, treeOrder } from "../drafts";
import { EditableName } from "../editable-name";
import { EditSurfaceProvider, useEditState } from "../surface";

/** One row the host shows, and the rows below it. */
export type HostRow = {
  readonly id: string;
  readonly name: string;
  readonly children?: readonly HostRow[];
};

/** Thanksgiving as seeded: a pumpkin pie over a pumpkin, and cream. */
export const THANKSGIVING_ROWS: readonly HostRow[] = [
  {
    id: "1",
    name: "Pumpkin pie",
    children: [{ id: "2", name: "Pumpkin" }],
  },
  { id: "3", name: "Whipped cream" },
];

function nodeOf(row: HostRow): PlanItemNode {
  const children = (row.children ?? []).map(nodeOf);
  return {
    item: {
      __typename: "PlanItem",
      id: row.id,
      name: row.name,
      bucket: null,
      children: children.map((it) => ({
        __typename: "PlanItem",
        id: it.item.id,
      })),
    },
    children,
  };
}

function Rows({
  entries,
  canEdit,
}: {
  entries: readonly TreeEntry[];
  canEdit: boolean;
}) {
  return (
    <ul>
      {entries.map((entry) =>
        entry.kind === "draft" ? (
          <li key={entry.draft.draftId}>
            <DraftRow draft={entry.draft} />
          </li>
        ) : (
          <li key={entry.node.item.id}>
            <EditableName
              itemId={entry.node.item.id}
              planId={THANKSGIVING}
              name={entry.node.item.name}
              hasChildren={entry.node.children.length > 0}
              canEdit={canEdit}
            >
              {entry.node.item.name}
            </EditableName>
            <Rows entries={entry.children} canEdit={canEdit} />
          </li>
        ),
      )}
    </ul>
  );
}

/** I show rows the way a surface does, each one editable. */
function EditHost({
  rows,
  canEdit,
}: {
  rows: readonly HostRow[];
  canEdit: boolean;
}) {
  const state = useEditState();
  const nodes = rows.map(nodeOf);
  const flat = (list: readonly PlanItemNode[]): PlanItemNode[] =>
    list.flatMap((it) => [it, ...flat(it.children)]);
  const tree = buildPlanTree([
    { id: THANKSGIVING, children: nodes.map((it) => ({ id: it.item.id })) },
    ...flat(nodes).map((it) => ({
      id: it.item.id,
      children: it.item.children,
    })),
  ]);
  const entries = buildEntries(nodes, state.drafts, THANKSGIVING);
  return (
    <EditSurfaceProvider
      state={state}
      order={treeOrder(entries)}
      tree={tree}
      createdStayPut
    >
      <Rows entries={entries} canEdit={canEdit} />
      <button type="button">Elsewhere</button>
    </EditSurfaceProvider>
  );
}

/** I render the host against the seeded plans, collecting what's sent. */
export function renderEditHost({
  rows = THANKSGIVING_ROWS,
  canEdit = true,
} = {}) {
  const cache = seededCache();
  const requests: ChangeRequest[] = [];
  const client = changeApiClient(cache, requests);
  render(
    <ApolloProvider client={client}>
      <EditHost rows={rows} canEdit={canEdit} />
    </ApolloProvider>,
    { cache },
  );
  return { cache, requests };
}
