/** I'm an ingredient line's saved parts, or its wording alone without them. */
export type IngredientParts = {
  text: string;
  quantity?: number;
  unit?: string;
  name?: string;
  preparation?: string;
};
