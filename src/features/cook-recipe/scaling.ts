/** The cooking graph used for temporary display scaling, not persisted changes. */
export type ScalingItem = {
  id: string;
  status: string;
  quantity: { quantity: number } | null;
  children: readonly { id: string }[];
  components: readonly { id: string }[];
  ingredient: {
    __typename: string;
    id: string;
    sectionOf?: { id: string } | null;
  } | null;
};

/** Absolute quantities for a new batch size; each linked ingredient is visited once. */
export function scaledQuantities(
  rootId: string,
  factor: number,
  read: (id: string) => ScalingItem | undefined,
) {
  if (!Number.isFinite(factor) || factor <= 0)
    throw new Error("Invalid recipe scale.");
  const quantities: Record<string, number> = {};
  const seen = new Set<string>();
  function visit(id: string) {
    if (seen.has(id)) return;
    seen.add(id);
    const item = read(id);
    if (!item || item.status === "DELETED") return;
    if (item.quantity) {
      const quantity = item.quantity.quantity * factor;
      if (!Number.isFinite(quantity))
        throw new Error("Scaled quantity is too large.");
      quantities[id] = quantity;
    }
    const ingredient = item.ingredient;
    if (
      id !== rootId &&
      ingredient?.__typename === "Recipe" &&
      !ingredient.sectionOf
    )
      return;
    [...item.children, ...item.components].forEach((child) => visit(child.id));
  }
  visit(rootId);
  return quantities;
}
