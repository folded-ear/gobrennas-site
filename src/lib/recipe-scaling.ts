/** The cooking graph, independent of scheduling and of the UI that reads it. */
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

/** Replace only a leading quantity, leaving units, wording and punctuation intact. */
const FRACTION = String.raw`(?:\d+\s*[/⁄]\s*\d+|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])`;
const NUMBER = String.raw`(?:\d*\.\d+|\d+)(?:\s*(?:(?:and|&)\s*)?${FRACTION})?|${FRACTION}`;
const WORD =
  "(?:a half|one half|half|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)";
// Text replacement only, not ingredient recognition or quantity arithmetic.
// Keep the accepted leading forms aligned with the API's Number.g4 grammar.
const LEADING_QUANTITY = new RegExp(
  String.raw`^(\s*)-?(?:${NUMBER}|${WORD})(?:\s*(?:and|&)\s*(?:${NUMBER}|${WORD}))*(?=\s|$)`,
  "iu",
);

export function scaledIngredientName(name: string, quantity: number): string {
  return name.replace(
    LEADING_QUANTITY,
    (_, space: string) => `${space}${quantity}`,
  );
}

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
