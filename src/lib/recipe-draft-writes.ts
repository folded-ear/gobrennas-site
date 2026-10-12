/** What text gathered elsewhere, as from a photo, may write to a recipe draft. */
export type RecipeDraftWrites = {
  /** I replace the title. */
  setTitle(text: string): void;
  /** I add one ingredient per nonblank line, after those already there. */
  appendIngredients(lines: readonly string[]): void;
  /** I add to the directions, as a paragraph of its own. */
  appendDirections(text: string): void;
};
