import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import {
  IngredientScope,
  ingredientsIn,
  RECIPE_SCOPE,
  useRecipeDraft,
} from "./use-recipe-draft";

const SECTION_SCOPE: IngredientScope = { kind: "section", index: 0 };

const setup = () => renderHook(() => useRecipeDraft({ onSave: vi.fn() }));

const rawIn = (
  values: Parameters<typeof ingredientsIn>[0],
  scope: IngredientScope,
) => ingredientsIn(values, scope).map((i) => i.raw);

test("pasting into an empty row replaces it", () => {
  const { result } = setup();

  act(() => result.current.pasteIngredients(RECIPE_SCOPE, 0, "a\nb\nc"));

  // the blank starter row is consumed, not left stranded above the paste
  expect(rawIn(result.current.values, RECIPE_SCOPE)).toEqual(["a", "b", "c"]);
});

test("pasting into a filled row inserts after it, trimming blank lines", () => {
  const { result } = setup();

  act(() => result.current.setIngredient(RECIPE_SCOPE, 0, { raw: "first" }));
  act(() => result.current.pasteIngredients(RECIPE_SCOPE, 0, " a \n\n b "));

  expect(rawIn(result.current.values, RECIPE_SCOPE)).toEqual([
    "first",
    "a",
    "b",
  ]);
});

test("adds, removes, and moves ingredients", () => {
  const { result } = setup();

  act(() => result.current.pasteIngredients(RECIPE_SCOPE, 0, "a\nb\nc"));
  act(() => result.current.moveIngredient(RECIPE_SCOPE, 2, 0));
  expect(rawIn(result.current.values, RECIPE_SCOPE)).toEqual(["c", "a", "b"]);

  act(() => result.current.removeIngredient(RECIPE_SCOPE, 1));
  expect(rawIn(result.current.values, RECIPE_SCOPE)).toEqual(["c", "b"]);

  act(() => result.current.addIngredient(RECIPE_SCOPE, 0));
  expect(rawIn(result.current.values, RECIPE_SCOPE)).toEqual(["c", "", "b"]);
});

test("ingredient operations are routed by scope", () => {
  const { result } = setup();

  act(() => result.current.addOwnedSection());
  act(() =>
    result.current.setIngredient(RECIPE_SCOPE, 0, { raw: "recipe ingredient" }),
  );
  act(() =>
    result.current.setIngredient(SECTION_SCOPE, 0, {
      raw: "section ingredient",
    }),
  );
  act(() => result.current.addIngredient(SECTION_SCOPE));

  expect(rawIn(result.current.values, RECIPE_SCOPE)).toEqual([
    "recipe ingredient",
  ]);
  expect(rawIn(result.current.values, SECTION_SCOPE)).toEqual([
    "section ingredient",
    "",
  ]);
});

test("removing a section leaves the others intact", () => {
  const { result } = setup();

  act(() => result.current.addOwnedSection());
  act(() => result.current.addOwnedSection());
  act(() => result.current.setSectionField(0, "name", "Dressing"));
  act(() => result.current.setSectionField(1, "name", "Salad"));
  act(() => result.current.removeSection(0));

  expect(result.current.values.sections).toHaveLength(1);
  const [remaining] = result.current.values.sections;
  expect(remaining.kind === "owned" && remaining.name).toBe("Salad");
});
