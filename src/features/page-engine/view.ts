import { PlanItemStatus } from "@/__generated__/graphql";
import type { Pending } from "./state";

/** Items placed under a parent, after one of its children or first. */
export type Insert = {
  readonly ids: readonly string[];
  readonly afterId: string | null;
};

/** What pending changes show over the cache's server data. */
export type View = {
  /** NEEDED or ACQUIRED statuses. */
  readonly status: ReadonlyMap<string, PlanItemStatus>;
  /** COMPLETED or DELETED statuses still in their undo window. */
  readonly pendingStatus: ReadonlyMap<string, PlanItemStatus>;
  /** Items completed or deleted, gone from every list. */
  readonly removed: ReadonlySet<string>;
  readonly name: ReadonlyMap<string, string>;
  readonly bucket: ReadonlyMap<string, string | null>;
  readonly parent: ReadonlyMap<string, string>;
  /** Placements under each parent, in the order they were made. */
  readonly inserts: ReadonlyMap<string, readonly Insert[]>;
  /** Items created in each plan. */
  readonly created: ReadonlyMap<string, readonly string[]>;
  /** Pantry items' store orders. */
  readonly storeOrder: ReadonlyMap<string, number>;
};

export const EMPTY_VIEW: View = {
  status: new Map(),
  pendingStatus: new Map(),
  removed: new Set(),
  name: new Map(),
  bucket: new Map(),
  parent: new Map(),
  inserts: new Map(),
  created: new Map(),
  storeOrder: new Map(),
};

const REMOVALS: ReadonlySet<PlanItemStatus> = new Set([
  PlanItemStatus.COMPLETED,
  PlanItemStatus.DELETED,
]);

/** I give what pending changes show, applied in order. */
export function buildView(pending: readonly Pending[]): View {
  if (pending.length === 0) return EMPTY_VIEW;
  const status = new Map<string, PlanItemStatus>();
  const pendingStatus = new Map<string, PlanItemStatus>();
  const removed = new Set<string>();
  const name = new Map<string, string>();
  const bucket = new Map<string, string | null>();
  const parent = new Map<string, string>();
  const inserts = new Map<string, Insert[]>();
  const created = new Map<string, string[]>();
  const storeOrder = new Map<string, number>();
  const place = (parentId: string, insert: Insert) => {
    inserts.set(parentId, [...(inserts.get(parentId) ?? []), insert]);
    insert.ids.forEach((id) => parent.set(id, parentId));
  };
  for (const { change, phase } of pending) {
    switch (change.kind) {
      case "status":
        if (phase === "held") pendingStatus.set(change.id, change.status);
        else if (REMOVALS.has(change.status)) removed.add(change.id);
        else status.set(change.id, change.status);
        break;
      case "rename":
        name.set(change.id, change.name);
        break;
      case "assignBucket":
        bucket.set(change.id, change.bucketId);
        break;
      case "create":
        place(change.parentId, { ids: [change.id], afterId: change.afterId });
        created.set(change.planId, [
          ...(created.get(change.planId) ?? []),
          change.id,
        ]);
        if (change.bucketId !== undefined) {
          bucket.set(change.id, change.bucketId);
        }
        break;
      case "move":
        place(change.parentId, { ids: change.ids, afterId: change.afterId });
        break;
      case "storeOrder":
        for (const [id, value] of Object.entries(change.storeOrders)) {
          storeOrder.set(id, value);
        }
        break;
    }
  }
  return {
    status,
    pendingStatus,
    removed,
    name,
    bucket,
    parent,
    inserts,
    created,
    storeOrder,
  };
}

/** I give a parent's children as shown: its own, with changes applied. */
export function overlayChildren(
  parentId: string,
  existing: readonly string[],
  view: View,
): readonly string[] {
  let ids = existing.filter(
    (id) =>
      !view.removed.has(id) && (view.parent.get(id) ?? parentId) === parentId,
  );
  for (const insert of view.inserts.get(parentId) ?? []) {
    const placed = insert.ids.filter((id) => !view.removed.has(id));
    ids = ids.filter((id) => !insert.ids.includes(id));
    const after = insert.afterId === null ? -1 : ids.indexOf(insert.afterId);
    const at = insert.afterId !== null && after < 0 ? ids.length : after + 1;
    ids = [...ids.slice(0, at), ...placed, ...ids.slice(at)];
  }
  return ids;
}

/**
 * I give a plan's descendants as shown: its own, less any under a removed
 * item, plus those created in it. An item's parent is found by parentOf.
 */
export function overlayDescendants(
  planId: string,
  existing: readonly string[],
  view: View,
  parentOf: (id: string) => string | undefined,
): readonly string[] {
  const underRemoved = (id: string) => {
    const seen = new Set<string>();
    let at: string | undefined = id;
    while (at !== undefined && at !== planId && !seen.has(at)) {
      if (view.removed.has(at)) return true;
      seen.add(at);
      at = view.parent.get(at) ?? parentOf(at);
    }
    return false;
  };
  const shown = existing.filter((id) => !underRemoved(id));
  const listed = new Set(shown);
  const added = (view.created.get(planId) ?? []).filter(
    (id) => !listed.has(id) && !underRemoved(id),
  );
  return added.length === 0 ? shown : [...shown, ...added];
}
