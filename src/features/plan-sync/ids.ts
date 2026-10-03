import type { Change } from "./state";

export const DRAFT_PREFIX = "draft:";

/** I tell an item waiting on its create from one the server has. */
export const isDraftId = (id: string): boolean => id.startsWith(DRAFT_PREFIX);

/** I give the item ids a change names, apart from a create's own. */
export function namedIds(change: Change): string[] {
  switch (change.kind) {
    case "status":
    case "rename":
    case "assignBucket":
      return [change.id];
    case "create":
      return change.afterId === null
        ? [change.parentId]
        : [change.parentId, change.afterId];
    case "move":
      return change.afterId === null
        ? [...change.ids, change.parentId]
        : [...change.ids, change.parentId, change.afterId];
  }
}

/** I give a change with every item id it names mapped, a create's own too. */
export function mapIds(change: Change, map: (id: string) => string): Change {
  const after = (id: string | null) => (id === null ? null : map(id));
  switch (change.kind) {
    case "status":
    case "rename":
    case "assignBucket":
      return { ...change, id: map(change.id) };
    case "create":
      return {
        ...change,
        id: map(change.id),
        parentId: map(change.parentId),
        afterId: after(change.afterId),
      };
    case "move":
      return {
        ...change,
        ids: change.ids.map(map),
        parentId: map(change.parentId),
        afterId: after(change.afterId),
      };
  }
}
