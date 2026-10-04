import type {
  ApolloCache,
  FieldFunctionOptions,
  Reference,
  TypePolicies,
} from "@apollo/client";
import { makeVar, type ReactiveVar } from "@apollo/client";
import {
  EMPTY_VIEW,
  overlayChildren,
  overlayDescendants,
  type View,
} from "./view";

const views = new WeakMap<ApolloCache, ReactiveVar<View>>();

/** I make the view a cache's pending changes are published to. */
export function makeView(): ReactiveVar<View> {
  return makeVar(EMPTY_VIEW);
}

/** I tie a cache to the view its policies read. */
export function attachView(cache: ApolloCache, view: ReactiveVar<View>) {
  views.set(cache, view);
  // So publishing tells the cache's watchers, even before a read has.
  view.attachCache(cache);
}

/** I show a view's changes in a cache. */
export function publishView(cache: ApolloCache, view: View): void {
  views.get(cache)?.(view);
}

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((it, i) => it === b[i]);

const itemRef = (
  toReference: FieldFunctionOptions["toReference"],
  id: string,
) => toReference({ __typename: "PlanItem", id })!;

/**
 * I give the field policies that show pending changes over a cache's
 * server data, read from the given view. Server data stays as it is.
 */
export function overlayPolicies(view: ReactiveVar<View>): TypePolicies {
  /** I give the id of the item a field is read on, with the view. */
  const shown = ({ readField }: FieldFunctionOptions) => ({
    v: view(),
    id: readField<string>("id")!,
  });

  /** I show a list of children, if anything changes it. */
  function children(
    existing: readonly Reference[] | undefined,
    options: FieldFunctionOptions,
  ) {
    const { v, id } = shown(options);
    if (existing === undefined || v === EMPTY_VIEW) return existing;
    const { readField, toReference } = options;
    const refs = existing.filter((ref) => readField("id", ref) !== undefined);
    const ids = refs.map((ref) => readField<string>("id", ref)!);
    const result = overlayChildren(id, ids, v);
    if (sameIds(result, ids)) return existing;
    const byId = new Map(ids.map((it, i) => [it, refs[i]]));
    return result.map((it) => byId.get(it) ?? itemRef(toReference, it));
  }

  /** I show a plan's descendants, if anything changes them. */
  function descendants(
    existing: readonly Reference[] | undefined,
    options: FieldFunctionOptions,
  ) {
    const { v, id } = shown(options);
    if (existing === undefined || v === EMPTY_VIEW) return existing;
    const { readField, toReference } = options;
    const refs = existing.filter((ref) => readField("id", ref) !== undefined);
    const ids = refs.map((ref) => readField<string>("id", ref)!);
    const byId = new Map(ids.map((it, i) => [it, refs[i]]));
    const parentOf = (itemId: string) => {
      const parent = readField<Reference>(
        "parent",
        byId.get(itemId) ?? itemRef(toReference, itemId),
      );
      return parent ? readField<string>("id", parent) : undefined;
    };
    const result = overlayDescendants(id, ids, v, parentOf);
    if (sameIds(result, ids)) return existing;
    return result.map((it) => byId.get(it) ?? itemRef(toReference, it));
  }

  /** I hide what a pending rename's new text hasn't been parsed into. */
  function parsed<T>(existing: T | undefined, options: FieldFunctionOptions) {
    const { v, id } = shown(options);
    return v.name.has(id) ? null : existing;
  }

  return {
    PlanItem: {
      fields: {
        status(existing, options) {
          const { v, id } = shown(options);
          return v.status.get(id) ?? existing;
        },
        pendingStatus(existing, options) {
          const { v, id } = shown(options);
          return v.pendingStatus.get(id) ?? existing ?? null;
        },
        name(existing, options) {
          const { v, id } = shown(options);
          return v.name.get(id) ?? existing;
        },
        ingredient: parsed,
        quantity: parsed,
        preparation: parsed,
        bucket(existing, options) {
          const { v, id } = shown(options);
          if (!v.bucket.has(id)) return existing;
          const bucketId = v.bucket.get(id);
          return bucketId === null || bucketId === undefined
            ? null
            : options.toReference({ __typename: "PlanBucket", id: bucketId });
        },
        parent(existing, options) {
          const { v, id } = shown(options);
          const parentId = v.parent.get(id);
          return parentId === undefined
            ? existing
            : itemRef(options.toReference, parentId);
        },
        children,
      },
    },
    Plan: {
      fields: {
        children,
        descendants,
      },
    },
  };
}
