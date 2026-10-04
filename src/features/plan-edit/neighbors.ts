import { ItemKey, sameKey } from "./drafts";
import { Direction } from "./keymap";

/**
 * I give the item next to one, the way asked, or the other way when
 * there's none that way; nothing when it stands alone or isn't there.
 */
export function neighborOf(
  order: readonly ItemKey[],
  key: ItemKey,
  direction: Direction,
): ItemKey | null {
  const at = order.findIndex((it) => sameKey(it, key));
  if (at < 0) return null;
  const [first, second] =
    direction === "backward" ? [at - 1, at + 1] : [at + 1, at - 1];
  return order[first] ?? order[second] ?? null;
}
