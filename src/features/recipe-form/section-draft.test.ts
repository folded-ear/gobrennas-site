import { RecognizedRangeType } from "@/__generated__/graphql";
import { describe, expect, it } from "vitest";
import { newRecipeDraft, toIngredientInfo } from "./recipe-draft";
import { borrowedSectionDraft, newSectionDraft } from "./section-draft";

describe("owned section drafts", () => {
  it("keeps new client identities separate from saved ids and serializes section content in order", () => {
    const crust = newSectionDraft();
    const filling = newSectionDraft();
    expect(crust.clientId).not.toBe(filling.clientId);
    expect(crust.ingredients[0].clientId).not.toBe(
      filling.ingredients[0].clientId,
    );
    expect(crust.id).toBeUndefined();
    const draft = {
      ...newRecipeDraft(),
      title: "Pie",
      sections: [
        {
          ...crust,
          title: " Crust ",
          directions: "Mix.\nChill.  ",
          ingredients: [
            ...crust.ingredients,
            {
              clientId: "flour-row",
              raw: "flour",
              recognition: {
                raw: "flour",
                cursor: 5,
                ranges: [
                  {
                    start: 0,
                    end: 5,
                    type: RecognizedRangeType.ITEM,
                    id: "flour-id",
                    quantity: null,
                  },
                ],
              },
            },
            { clientId: "salt-row", raw: "pinch of salt" },
          ],
        },
        { ...filling, id: "saved-section", title: "Filling" },
      ],
    };
    expect(toIngredientInfo(draft).sections).toEqual([
      {
        id: null,
        name: "Crust",
        directions: "Mix.\nChill.  ",
        ingredients: [
          { raw: "flour", ingredientId: "flour-id" },
          { raw: "pinch of salt" },
        ],
      },
      { id: "saved-section", name: "Filling", directions: "", ingredients: [] },
    ]);
    expect(draft.sections[0].clientId).toBe(crust.clientId);
    expect(draft.sections[1].clientId).toBe(filling.clientId);
  });

  it("rejects an untitled section before serializing any recipe", () => {
    const section = { ...newSectionDraft(), title: " \t " };
    expect(() =>
      toIngredientInfo({
        ...newRecipeDraft(),
        title: "Pie",
        sections: [section],
      }),
    ).toThrow("A section title is required.");
  });
});

describe("borrowed section drafts", () => {
  it("refers to the borrowed section and its recipe, and serializes only its id", () => {
    const vinaigrette = {
      id: "section-vinaigrette",
      name: "Vinaigrette",
      sectionOf: { id: "recipe-green-salad", name: "Green salad" },
    };

    const section = borrowedSectionDraft(vinaigrette);

    expect(section).toMatchObject({
      id: "section-vinaigrette",
      referenceRecipeId: "recipe-green-salad",
      title: "Vinaigrette",
    });
    expect(section.clientId).not.toBe(
      borrowedSectionDraft(vinaigrette).clientId,
    );
    expect(
      toIngredientInfo({
        ...newRecipeDraft(),
        title: "Salad",
        sections: [section],
      }).sections,
    ).toEqual([{ id: "section-vinaigrette" }]);
  });
});
