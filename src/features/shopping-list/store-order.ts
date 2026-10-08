import type { ShoppingIngredient } from "./model";

/** I order ingredients as shopping shows them: unplaced first, then by name. */
export function byStoreOrder(
  a: ShoppingIngredient,
  b: ShoppingIngredient,
): number {
  return a.storeOrder - b.storeOrder || a.name.localeCompare(b.name);
}

/** Store order 0 means an ingredient has yet to be placed. */
export const UNPLACED = 0;

/** What lies past the last placed ingredient, for a drop after it. */
const PAST_LAST = 1;

const isPlaced = (it: ShoppingIngredient) => it.storeOrder !== UNPLACED;

/**
 * I give the store orders that put one ingredient before or after another
 * among the given ones, as the server will: the moved one between its new
 * neighbors, and the target as well when it was unplaced.
 */
export function storeOrdersFor(
  ingredients: readonly ShoppingIngredient[],
  id: string,
  targetId: string,
  after: boolean,
): Readonly<Record<string, number>> {
  const rest = ingredients.filter((it) => it.id !== id).sort(byStoreOrder);
  const at = rest.findIndex((it) => it.id === targetId);
  if (id === targetId || at < 0) return {};
  const target = rest[at];
  if (!isPlaced(target)) {
    // The server places both, ahead of everything placed.
    const high = rest.find(isPlaced)?.storeOrder ?? PAST_LAST;
    const [first, second] = after ? [targetId, id] : [id, targetId];
    return { [first]: high / 3, [second]: (high * 2) / 3 };
  }
  const neighbor = rest[after ? at + 1 : at - 1];
  const bound = after
    ? (neighbor?.storeOrder ?? target.storeOrder + PAST_LAST)
    : (neighbor?.storeOrder ?? UNPLACED);
  return { [id]: (target.storeOrder + bound) / 2 };
}

/**
 * I tell whether putting one ingredient before or after another, among the
 * given ones as shown, would change anything.
 */
export function storeMoveChanges(
  ingredients: readonly ShoppingIngredient[],
  id: string,
  targetId: string,
  after: boolean,
): boolean {
  if (id === targetId) return false;
  const shown = [...ingredients].sort(byStoreOrder);
  const at = shown.findIndex((it) => it.id === targetId);
  const moved = shown.find((it) => it.id === id);
  if (at < 0 || moved === undefined) return false;
  if (!isPlaced(moved) || !isPlaced(shown[at])) return true;
  return shown[after ? at + 1 : at - 1]?.id !== id;
}
