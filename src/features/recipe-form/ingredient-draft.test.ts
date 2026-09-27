import { describe, expect, it } from "vitest";
import {
  insertIngredient,
  moveIngredient,
  newIngredientDraft,
  pasteIngredientLines,
  removeIngredient,
  updateIngredient,
} from "./ingredient-draft";
import { newRecipeDraft, toIngredientInfo } from "./recipe-draft";

describe("ingredient drafts", () => {
  it("keeps duplicate lines distinct and preserves identity through edits and moves", () => {
    const first = newIngredientDraft("salt");
    const second = newIngredientDraft("salt");
    const original = [first, second];

    const edited = updateIngredient(original, second.clientId, "  sea salt  ");
    const moved = moveIngredient(edited, second.clientId, -1);

    expect(first.clientId).not.toBe(second.clientId);
    expect(moved).toEqual([
      { clientId: second.clientId, raw: "  sea salt  " },
      first,
    ]);
    expect(original).toEqual([
      first,
      { clientId: second.clientId, raw: "salt" },
    ]);
    expect(moveIngredient(moved, second.clientId, 1)).toEqual(edited);
  });

  it("inserts and removes a row without changing neighboring rows", () => {
    const first = newIngredientDraft("2 cups flour");
    const last = newIngredientDraft("1 tsp salt");
    const inserted = newIngredientDraft();
    const rows = insertIngredient([first, last], 1, inserted);

    expect(rows).toEqual([first, inserted, last]);
    expect(removeIngredient(rows, inserted.clientId)).toEqual([first, last]);
    expect(removeIngredient([inserted], inserted.clientId)).toEqual([]);
  });

  it("leaves the collection intact at reorder boundaries or for a missing identity", () => {
    const rows = [newIngredientDraft("flour"), newIngredientDraft("salt")];
    expect(moveIngredient(rows, rows[0].clientId, -1)).toEqual(rows);
    expect(moveIngredient(rows, rows[1].clientId, 1)).toEqual(rows);
    expect(moveIngredient(rows, "missing", 1)).toEqual(rows);
    expect(updateIngredient(rows, "missing", "sugar")).toEqual(rows);
    expect(removeIngredient(rows, "missing")).toEqual(rows);
  });

  it.each(["\n", "\r\n", "\r"])(
    "splits pasted lines on %j and skips blanks without changing raw text",
    (newline) => {
      expect(
        pasteIngredientLines(
          "",
          `  flour  ${newline} ${newline}salt${newline}`,
          0,
          0,
        ),
      ).toEqual(["  flour  ", "salt"]);
    },
  );

  it("preserves unselected text around a multiline paste", () => {
    expect(
      pasteIngredientLines(
        "2 cups rice, rinsed",
        "flour\n1 cup lentils",
        7,
        11,
      ),
    ).toEqual(["2 cups flour", "1 cup lentils, rinsed"]);
    expect(pasteIngredientLines("", "\n \r\n", 0, 0)).toEqual([]);
  });

  it("serializes only populated raw lines in their current order without client identities", () => {
    const draft = newRecipeDraft();
    draft.title = "Bread";
    draft.ingredients = [
      newIngredientDraft(""),
      newIngredientDraft(" 2 cups flour "),
      newIngredientDraft(" \t "),
      newIngredientDraft("1 tsp salt"),
      newIngredientDraft(""),
    ];
    draft.ingredients = moveIngredient(
      draft.ingredients,
      draft.ingredients[3].clientId,
      -1,
    );
    draft.ingredients = moveIngredient(
      draft.ingredients,
      draft.ingredients[2].clientId,
      -1,
    );

    expect(toIngredientInfo(draft).ingredients).toEqual([
      { raw: "1 tsp salt" },
      { raw: " 2 cups flour " },
    ]);
    expect(draft.ingredients).toHaveLength(5);
  });
});
