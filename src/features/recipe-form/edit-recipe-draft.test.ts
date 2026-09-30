import { describe, expect, it } from "vitest";
import { recipeToDraft, toRecipeUpdate } from "./edit-recipe-draft";
import { moveIngredient, updateIngredient } from "./ingredient-draft";
import { newSectionDraft } from "./section-draft";
import { storedInfo, storedRecipe } from "./test/edit-recipe";

describe("lossless recipe editing", () => {
  it("round-trips every supported field and both section kinds when only the title changes", () => {
    const initial = recipeToDraft(storedRecipe);
    expect(
      toRecipeUpdate({ ...initial, title: "New title" }, initial, storedRecipe),
    ).toEqual({ ...storedInfo, name: "New title" });
    expect(initial.sections[1].referenceRecipeId).toBe("other-recipe");
  });

  it("preserves nullable values, zeroes, raw blank rows and whitespace on unchanged fields", () => {
    const recipe = {
      ...storedRecipe,
      name: " Pie ",
      externalUrl: null,
      directions: null,
      totalTime: 0,
      yield: null,
      labels: null,
      ingredients: [{ ...storedRecipe.ingredients[1], raw: "  " }],
    };
    const initial = recipeToDraft(recipe);
    const info = toRecipeUpdate(initial, initial, recipe);
    expect(info).toMatchObject({
      name: " Pie ",
      externalUrl: null,
      directions: null,
      totalTime: 0,
      yield: null,
      calories: 0,
      labels: [],
      ingredients: [{ raw: "  " }],
    });
    expect(info).not.toHaveProperty("photo");
    expect(info).not.toHaveProperty("photoFocus");
  });

  it("keeps stored interpretation on focus recognition, but drops it after a real row edit", () => {
    const initial = recipeToDraft(storedRecipe);
    const recognized = {
      ...initial.ingredients[0],
      recognition: { raw: initial.ingredients[0].raw, cursor: 0, ranges: [] },
    };
    expect(
      toRecipeUpdate(
        { ...initial, ingredients: [recognized] },
        initial,
        storedRecipe,
      ).ingredients,
    ).toEqual([storedInfo.ingredients?.[0]]);
    const rows = updateIngredient(
      initial.ingredients,
      initial.ingredients[0].clientId,
      "salt",
    );
    expect(
      toRecipeUpdate({ ...initial, ingredients: rows }, initial, storedRecipe)
        .ingredients?.[0],
    ).toEqual({ raw: "salt" });
    expect(
      moveIngredient(
        initial.ingredients,
        initial.ingredients[0].clientId,
        1,
      )[1],
    ).toBe(initial.ingredients[0]);
  });

  it("retains saved section identity and labels, and handles additions and removals", () => {
    const initial = recipeToDraft(storedRecipe);
    const added = { ...newSectionDraft(), title: "Sauce" };
    const draft = {
      ...initial,
      sections: [
        { ...initial.sections[0], title: "Pastry", directions: "Chill." },
        added,
      ],
    };
    expect(toRecipeUpdate(draft, initial, storedRecipe).sections).toEqual([
      { ...storedInfo.sections?.[0], name: "Pastry", directions: "Chill." },
      { id: null, name: "Sauce", directions: "", ingredients: [] },
    ]);
  });

  it("preserves duplicate owned section references without editing them twice, as in the current client", () => {
    const recipe = {
      ...storedRecipe,
      sections: [storedRecipe.sections[0], storedRecipe.sections[0]],
    };
    const initial = recipeToDraft(recipe);
    expect(initial.sections[0].referenceRecipeId).toBeUndefined();
    expect(initial.sections[1].referenceRecipeId).toBe("pie");
    expect(toRecipeUpdate(initial, initial, recipe).sections).toEqual([
      storedInfo.sections?.[0],
      { id: "crust" },
    ]);
  });

  it("blocks removing a section still referenced by an ordinary ingredient, including inside another section", () => {
    const recipe = {
      ...storedRecipe,
      ingredients: [
        {
          ...storedRecipe.ingredients[0],
          ingredient: { __typename: "Recipe" as const, id: "crust" },
        },
      ],
    };
    const initial = recipeToDraft(recipe);
    expect(() => toRecipeUpdate(initial, initial, recipe)).not.toThrow();
    const removed = { ...initial, sections: [] };
    expect(() => toRecipeUpdate(removed, initial, recipe)).toThrow(
      "still used by an ingredient",
    );
    const added = {
      ...newSectionDraft(),
      title: "Sauce",
      ingredients: initial.ingredients,
    };
    expect(() =>
      toRecipeUpdate(
        { ...initial, ingredients: [], sections: [added] },
        initial,
        recipe,
      ),
    ).toThrow("still used by an ingredient");
    expect(() =>
      toRecipeUpdate({ ...removed, ingredients: [] }, initial, recipe),
    ).not.toThrow();
  });
});
