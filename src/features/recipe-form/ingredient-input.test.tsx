import {
  RecognitionKind,
  RecognizedRangeType as Type,
} from "@/__generated__/graphql";
import { readSelection } from "@/features/morsel/editor-dom";
import {
  editableMorsel,
  withTextInsertion,
} from "@/features/morsel/test-helpers";
import {
  act,
  cleanup,
  configure,
  getConfig,
  render,
  screen,
  userEvent,
} from "@/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recipeToDraft, toRecipeUpdate } from "./edit-recipe-draft";
import { RecipeForm } from "./index";
import { newIngredientDraft } from "./ingredient-draft";
import type {
  IngredientRecognition,
  RecognizeIngredient,
} from "./ingredient-recognition";
import {
  newRecipeDraft,
  toIngredientInfo,
  type RecipeDraft,
} from "./recipe-draft";
import { storedInfo, storedRecipe } from "./test/edit-recipe";

function recognized(raw: string, cursor = raw.length): IngredientRecognition {
  return {
    raw,
    cursor,
    ranges: [
      {
        start: 0,
        end: raw.length,
        type: Type.ITEM,
        quantity: null,
        id: `pantry-${raw}`,
      },
    ],
  };
}

function deferred() {
  let resolve!: (result: IngredientRecognition) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<IngredientRecognition>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

async function recognizeFlour(
  raw: string,
  cursor: number,
): Promise<IngredientRecognition> {
  const name = /\bfl\w*/.exec(raw);
  const start = name?.index ?? 0;
  const end = start + (name?.[0].length ?? 0);
  return {
    raw,
    cursor,
    ranges:
      name?.[0] === "flour"
        ? [{ start, end, type: Type.ITEM, quantity: null, id: "pantry-flour" }]
        : [],
    suggestions: [
      {
        name: "flour",
        kind: RecognitionKind.PANTRY_ITEM,
        detail: null,
        target: { start, end, type: Type.ITEM, id: "pantry-flour" },
      },
    ],
  };
}

function editor(recognize: RecognizeIngredient, lines = [""]) {
  const submit = vi
    .fn<(draft: RecipeDraft) => Promise<void>>()
    .mockResolvedValue(undefined);
  const view = render(
    <RecipeForm
      heading="Add Recipe"
      initialDraft={{
        ...newRecipeDraft(),
        title: "Bread",
        ingredients: lines.map(newIngredientDraft),
      }}
      onSubmit={submit}
      onCancel={vi.fn()}
      recognizeIngredient={recognize}
    />,
  );
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  return { user, submit, ...view };
}

const tick = (ms = 300) => act(() => vi.advanceTimersByTimeAsync(ms));
const input = (number = 1) => editableMorsel(`Ingredient ${number}`);

withTextInsertion();

const originalAsyncWrapper = getConfig().asyncWrapper;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  // RTL's default wrapper waits on an unadvanced timer under Vitest fake timers.
  configure({
    asyncWrapper: async (callback) => {
      let result;
      await act(async () => {
        result = await callback();
      });
      return result;
    },
  });
});
afterEach(() => {
  cleanup();
  configure({ asyncWrapper: originalAsyncWrapper });
  vi.useRealTimers();
});

describe("ingredient recognition input", () => {
  it("recognizes saved recipe and section rows without focus and preserves their saved interpretation", async () => {
    const recognize = vi.fn<RecognizeIngredient>(async (raw, cursor) =>
      recognized(raw, cursor),
    );
    const initial = recipeToDraft(storedRecipe);
    const submit = vi.fn().mockResolvedValue(undefined);
    render(
      <RecipeForm
        heading="Edit Recipe"
        initialDraft={initial}
        onSubmit={async (draft) => {
          await submit(toRecipeUpdate(draft, initial, storedRecipe));
        }}
        onCancel={vi.fn()}
        recognizeIngredient={recognize}
      />,
    );
    await tick(0);
    expect(
      screen.getByLabelText("Recognition for ingredient 1"),
    ).toHaveTextContent(storedRecipe.ingredients[0].raw);
    expect(
      screen.getByLabelText("Recognition for ingredient 2"),
    ).toHaveTextContent(storedRecipe.ingredients[1].raw);
    expect(
      screen.getByLabelText("Recognition for section 1 ingredient 1"),
    ).toHaveTextContent(storedRecipe.sections[0].ingredients[0].raw);
    expect(input()).not.toHaveFocus();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(recognize).toHaveBeenCalledTimes(3);
    for (const call of recognize.mock.calls)
      expect(call[3]?.suggest).toBe(false);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(submit).toHaveBeenCalledWith(storedInfo);
  });

  it.each(["", "   "])(
    "omits cleared saved ingredients in the recipe and its owned section (%j)",
    async (blank) => {
      const initial = recipeToDraft(storedRecipe);
      const submit = vi.fn().mockResolvedValue(undefined);
      render(
        <RecipeForm
          heading="Edit Recipe"
          initialDraft={initial}
          onSubmit={async (draft) => {
            await submit(toRecipeUpdate(draft, initial, storedRecipe));
          }}
          onCancel={vi.fn()}
          recognizeIngredient={recognizeFlour}
        />,
      );
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await tick(0);
      for (const field of [input(), editableMorsel("Section 1 ingredient 1")]) {
        await user.clear(field);
        if (blank) await user.type(field, blank);
      }
      await user.click(screen.getByRole("button", { name: "Save recipe" }));
      expect(submit).toHaveBeenCalledWith({
        ...storedInfo,
        ingredients: [storedInfo.ingredients?.[1]],
        sections: [
          { ...storedInfo.sections?.[0], ingredients: [] },
          storedInfo.sections?.[1],
        ],
      });
    },
  );

  it("saves a different picked food on a saved row even when its name leaves the text unchanged", async () => {
    const recipe = {
      ...storedRecipe,
      sections: [],
      ingredients: [
        {
          ...storedRecipe.ingredients[1],
          raw: "flour",
          ingredient: { __typename: "PantryItem" as const, id: "old-flour" },
        },
      ],
    };
    const initial = recipeToDraft(recipe);
    const submit = vi.fn().mockResolvedValue(undefined);
    render(
      <RecipeForm
        heading="Edit Recipe"
        initialDraft={initial}
        onSubmit={async (draft) => {
          await submit(toRecipeUpdate(draft, initial, recipe));
        }}
        onCancel={vi.fn()}
        recognizeIngredient={recognizeFlour}
      />,
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await tick(0);
    await user.click(input());
    await user.keyboard("{End}{ArrowDown}");
    await tick();
    await user.click(screen.getByRole("option", { name: "flour" }));
    expect(input()).toHaveTextContent(/^flour$/);
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(submit).toHaveBeenCalledWith({
      ...storedInfo,
      sections: [],
      ingredients: [{ raw: "flour", ingredientId: "pantry-flour" }],
    });
  });

  it("keeps a recognized row quiet on return and through quantity, unit, and preparation edits until the name changes", async () => {
    const { user } = editor(recognizeFlour, ["1 cup flour, sifted"]);
    await user.click(input());
    await tick();
    // Recognition arriving during an active editing session must not close suggestions.
    expect(screen.getByRole("listbox")).toBeVisible();
    await user.click(screen.getByRole("textbox", { name: /title/i }));
    await user.click(input());
    await tick();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.keyboard("{Home}2");
    await tick();
    expect(input()).toHaveTextContent("21 cup flour, sifted");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.pointer([
      { keys: "[MouseLeft>]", target: input(), offset: 3 },
      { offset: 6 },
      { keys: "[/MouseLeft]" },
    ]);
    await user.paste("tablespoon");
    await tick();
    expect(input()).toHaveTextContent("21 tablespoon flour, sifted");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.keyboard("{End}{Backspace>8/}");
    await tick();
    expect(input()).toHaveTextContent("21 tablespoon flour");
    expect(
      screen.getByLabelText("Recognition for ingredient 1"),
    ).toHaveTextContent("flour");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.keyboard("{Backspace}");
    await tick();
    expect(input()).toHaveTextContent("21 tablespoon flou");
    expect(screen.getByRole("listbox")).toBeVisible();
  });

  it("settles an explicit choice but lets ArrowDown request alternatives before its response arrives", async () => {
    const { user } = editor(recognizeFlour, ["1 cup fl"]);
    await user.click(input());
    await user.keyboard("{End}");
    await tick();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(input()).toHaveTextContent("1 cup flour");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.keyboard("{ArrowLeft}{ArrowRight}");
    await tick();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("textbox", { name: /title/i }));
    await user.click(input());
    await user.keyboard("{End}{ArrowDown}");
    await tick();
    expect(screen.getByRole("listbox")).toBeVisible();
  });

  it.each([RecognitionKind.RECIPE, RecognitionKind.SECTION])(
    "selects %s without adding a row and immediately saves the chosen identity and parsed quantity",
    async (kind) => {
      const raw = "2 cups sto, chilled";
      const recognize = vi.fn<RecognizeIngredient>().mockResolvedValue({
        raw,
        cursor: 10,
        ranges: [
          { start: 0, end: 1, type: Type.QUANTITY, quantity: 2, id: null },
          { start: 2, end: 6, type: Type.UNIT, quantity: null, id: "cup" },
        ],
        suggestions: [
          {
            name: "stock",
            kind,
            detail: null,
            target: {
              start: 7,
              end: 10,
              type: Type.ITEM,
              id: "selected-stock",
            },
          },
        ],
      });
      const { user, submit } = editor(recognize, [raw]);
      await user.click(input());
      await user.keyboard("{Home}{ArrowRight>10/}");
      await tick();
      await user.keyboard("{ArrowDown}{Enter}");
      expect(
        screen.getAllByRole("combobox", { name: /^Ingredient / }),
      ).toHaveLength(1);
      expect(input().textContent).toBe("2 cups stock, chilled");
      await user.click(screen.getByRole("button", { name: "Save recipe" }));
      expect(toIngredientInfo(submit.mock.calls[0][0]).ingredients).toEqual([
        {
          raw: "2 cups stock, chilled",
          quantity: 2,
          uomId: "cup",
          ingredientId: "selected-stock",
          preparation: "chilled",
        },
      ]);
    },
  );

  it("sends the remapped explicit choice after composing a quantity and releases it after a name edit", async () => {
    const raw = "2 stock";
    const recognize = vi
      .fn<RecognizeIngredient>()
      .mockImplementation(async (text, cursor) => ({
        raw: text,
        cursor,
        ranges: [],
        suggestions: [
          {
            name: "stock",
            kind: RecognitionKind.RECIPE,
            detail: null,
            target: {
              start: 2,
              end: text.length,
              type: Type.ITEM,
              id: "recipe-stock",
            },
          },
        ],
      }));
    const { user } = editor(recognize, [raw]);
    await user.click(input());
    await user.keyboard("{End}");
    await tick();
    await user.keyboard("{ArrowDown}{Enter}");
    await user.keyboard("{Home}");
    act(() =>
      input().dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true }),
      ),
    );
    await user.keyboard("1");
    await tick();
    expect(recognize).toHaveBeenCalledTimes(1);
    act(() =>
      input().dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true, data: "1" }),
      ),
    );
    await tick();
    expect(recognize).toHaveBeenLastCalledWith(
      "12 stock",
      1,
      expect.any(AbortSignal),
      {
        suggest: true,
        choice: {
          food: { id: "recipe-stock", name: "stock", kind: "Recipe" },
          range: { start: 3, end: 8 },
        },
      },
    );
    await user.keyboard("{End}s");
    await tick();
    expect(recognize).toHaveBeenLastCalledWith(
      "12 stocks",
      9,
      expect.any(AbortSignal),
      { suggest: true, choice: undefined },
    );
  });

  it("recognizes every pasted row immediately through the shared queue and keeps failures local", async () => {
    const first = deferred();
    const second = deferred();
    const third = deferred();
    const fourth = deferred();
    const pending = [first, second, third, fourth];
    const recognize = vi
      .fn<RecognizeIngredient>()
      .mockImplementation(() => pending.shift()!.promise);
    const { user, submit } = editor(recognize, ["untouched", ""]);
    await user.click(input(2));
    await user.paste("flour\r\nsalt\neggs\nwater");
    await tick(0);
    expect(recognize).toHaveBeenCalledTimes(3);
    expect(recognize.mock.calls.map(([raw]) => raw)).not.toContain("untouched");
    expect(input(5)).toHaveFocus();
    await act(async () => first.reject(new Error("offline")));
    await tick(0);
    expect(recognize).toHaveBeenCalledTimes(4);
    const [, b, c, d] = recognize.mock.calls;
    await act(async () => {
      second.resolve(recognized(b[0], b[1]));
      third.resolve(recognized(c[0], c[1]));
      fourth.resolve(recognized(d[0], d[1]));
    });
    await tick(300);
    expect(recognize).toHaveBeenCalledTimes(4);
    expect(screen.getByText(/Couldn’t recognize/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    const refs = toIngredientInfo(submit.mock.calls[0][0]).ingredients;
    expect(refs?.map((ref) => ref.raw)).toEqual([
      "untouched",
      "flour",
      "salt",
      "eggs",
      "water",
    ]);
    expect(refs?.filter((ref) => ref.ingredientId)).toHaveLength(3);
  });

  it("recognizes the first row again when another multiline paste starts with the same text", async () => {
    const recognize = vi
      .fn<RecognizeIngredient>()
      .mockImplementation(async (raw, cursor) => recognized(raw, cursor));
    const { user, submit } = editor(recognize);
    await user.click(input());
    await user.paste("flour\nsalt");
    await tick();
    expect(
      screen.getByLabelText("Recognition for ingredient 1"),
    ).toHaveTextContent("flour");

    await user.click(input());
    await user.pointer([
      { keys: "[MouseLeft>]", target: input(), offset: 0 },
      { offset: 5 },
      { keys: "[/MouseLeft]" },
    ]);
    await user.paste("flour\neggs");
    await tick();

    expect(input(2)).toHaveFocus();
    expect(
      screen.getByLabelText("Recognition for ingredient 1"),
    ).toHaveTextContent("flour");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(
      toIngredientInfo(submit.mock.calls[0][0]).ingredients?.[0],
    ).toMatchObject({
      raw: "flour",
      ingredientId: "pantry-flour",
    });
  });

  it("keeps a failed-save alert visible when background recognition completes", async () => {
    const pending = deferred();
    const recognize = vi
      .fn<RecognizeIngredient>()
      .mockReturnValue(pending.promise);
    const { user, submit } = editor(recognize);
    submit.mockRejectedValueOnce(new Error("Save failed"));
    await user.type(input(), "flour");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t save recipe");
    await tick();
    await act(async () => pending.resolve(recognized("flour")));
    expect(screen.getByText("Ingredient", { exact: true })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t save recipe");
    await user.type(input(), "s");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("treats a mismatched response as a recoverable recognition error", async () => {
    const recognize = vi
      .fn<RecognizeIngredient>()
      .mockResolvedValue(recognized("salt"));
    const { user, submit } = editor(recognize);
    await user.type(input(), "flour");
    await tick();
    expect(
      screen.getByRole("button", {
        name: "Retry recognition for ingredient 1",
      }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(toIngredientInfo(submit.mock.calls[0][0]).ingredients).toEqual([
      { raw: "flour" },
    ]);
  });

  it("debounces eligible text and displays labeled parsed parts while preserving editing", async () => {
    const recognize = vi.fn<RecognizeIngredient>().mockResolvedValue({
      raw: "2 _cups_ “flour”, sifted",
      cursor: 24,
      ranges: [
        { start: 0, end: 1, type: Type.QUANTITY, quantity: 2, id: null },
        { start: 2, end: 8, type: Type.NEW_UNIT, quantity: null, id: null },
        { start: 9, end: 16, type: Type.NEW_ITEM, quantity: null, id: null },
      ],
    });
    const { user, submit } = editor(recognize);
    await user.type(input(), "2");
    await tick();
    expect(recognize).not.toHaveBeenCalled();
    await user.type(input(), " _cups_ “flour”, sifted");
    await tick(299);
    expect(recognize).not.toHaveBeenCalled();
    expect(
      screen.getByRole("status", { name: "Ingredient 1: recognizing" }),
    ).toBeVisible();
    expect(input()).toHaveAttribute("aria-busy", "true");
    await tick(1);
    expect(
      screen.queryByRole("status", { name: "Ingredient 1: recognizing" }),
    ).not.toBeInTheDocument();
    expect(input()).toHaveAttribute("aria-busy", "false");
    expect(recognize).toHaveBeenCalledWith(
      "2 _cups_ “flour”, sifted",
      24,
      expect.any(AbortSignal),
      { choice: undefined, suggest: true },
    );
    expect(screen.getByText("Quantity")).toBeVisible();
    expect(screen.getByText("New unit")).toBeVisible();
    expect(screen.getByText("New ingredient")).toBeVisible();
    expect(screen.getByText("Preparation")).toBeVisible();
    expect(screen.getByText("sifted")).toBeVisible();
    expect(input()).toHaveFocus();
    expect(input()).toHaveTextContent("2 _cups_ “flour”, sifted");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(toIngredientInfo(submit.mock.calls[0][0]).ingredients).toEqual([
      {
        raw: "2 _cups_ “flour”, sifted",
        quantity: 2,
        units: "cups",
        ingredient: "flour",
        preparation: "sifted",
      },
    ]);
  });

  it("rejects late results even when text changes away and back to the original", async () => {
    const old = deferred();
    const latest = deferred();
    const recognize = vi
      .fn<RecognizeIngredient>()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(latest.promise);
    const { user, submit } = editor(recognize);
    await user.type(input(), "flour");
    await tick();
    await user.type(input(), "s{Backspace}");
    expect(recognize.mock.calls[0][2].aborted).toBe(true);
    await tick();
    await act(async () => old.resolve(recognized("flour")));
    expect(
      screen.queryByText("Ingredient", { exact: true }),
    ).not.toBeInTheDocument();
    await act(async () =>
      latest.resolve({
        ...recognized("flour"),
        ranges: [
          {
            start: 0,
            end: 5,
            type: Type.ITEM,
            id: "new-flour-id",
            quantity: null,
          },
        ],
      }),
    );
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(toIngredientInfo(submit.mock.calls[0][0]).ingredients).toEqual([
      { raw: "flour", ingredientId: "new-flour-id" },
    ]);
  });

  it("includes cursor-only changes and ignores results for the previous cursor", async () => {
    const old = deferred();
    const latest = deferred();
    const recognize = vi
      .fn<RecognizeIngredient>()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(latest.promise);
    const { user } = editor(recognize);
    await user.type(input(), "flour");
    await tick();
    await user.keyboard("{Home}");
    await tick();
    await act(async () => old.resolve(recognized("flour", 5)));
    expect(
      screen.queryByText("Ingredient", { exact: true }),
    ).not.toBeInTheDocument();
    expect(recognize).toHaveBeenLastCalledWith(
      "flour",
      0,
      expect.any(AbortSignal),
      { choice: undefined, suggest: true },
    );
    await act(async () => latest.resolve(recognized("flour", 0)));
    expect(screen.getByText("Ingredient", { exact: true })).toBeVisible();
    expect(readSelection(input()).start).toBe(0);
    expect(input()).toHaveFocus();
  });

  it("shows a non-blocking failure and retries the current row", async () => {
    const recognize = vi
      .fn<RecognizeIngredient>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementationOnce(async (raw, cursor) => recognized(raw, cursor));
    const { user } = editor(recognize);
    await user.type(input(), "salt");
    await tick();
    expect(input()).toBeEnabled();
    expect(input()).toHaveTextContent("salt");
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeEnabled();
    await user.click(
      screen.getByRole("button", {
        name: "Retry recognition for ingredient 1",
      }),
    );
    await tick();
    expect(screen.queryByText(/Couldn’t recognize/)).not.toBeInTheDocument();
    expect(screen.getByText("Ingredient", { exact: true })).toBeVisible();
  });

  it("saves raw text immediately after an edit instead of waiting or sending obsolete ids", async () => {
    const pending = deferred();
    const recognize = vi
      .fn<RecognizeIngredient>()
      .mockImplementationOnce(async (raw, cursor) => recognized(raw, cursor))
      .mockReturnValueOnce(pending.promise);
    const { user, submit } = editor(recognize);
    await user.type(input(), "flour");
    await tick();
    await user.clear(input());
    await user.type(input(), "salt");
    expect(
      screen.queryByText("Ingredient", { exact: true }),
    ).not.toBeInTheDocument();
    await tick();
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    const saved = submit.mock.calls[0][0];
    expect(toIngredientInfo(saved).ingredients).toEqual([{ raw: "salt" }]);
    await act(async () => pending.resolve(recognized("salt")));
    expect(toIngredientInfo(saved).ingredients).toEqual([{ raw: "salt" }]);
    expect(submit).toHaveBeenCalledOnce();
  });

  it("keeps simultaneous results attached to their rows through reordering", async () => {
    const flour = deferred();
    const salt = deferred();
    const recognize = vi
      .fn<RecognizeIngredient>()
      .mockImplementation((raw) =>
        raw === "flour" ? flour.promise : salt.promise,
      );
    const { user, submit } = editor(recognize, ["flour", "salt"]);
    await user.click(input(1));
    await user.keyboard("{End}");
    await tick();
    await user.click(input(2));
    await user.keyboard("{End}");
    await tick();
    await user.click(
      screen.getByRole("button", { name: "Move ingredient 2 up" }),
    );
    await tick();
    await act(async () => {
      flour.resolve(recognized("flour"));
      salt.resolve(recognized("salt"));
    });
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(toIngredientInfo(submit.mock.calls[0][0]).ingredients).toEqual([
      { raw: "salt", ingredientId: "pantry-salt" },
      { raw: "flour", ingredientId: "pantry-flour" },
    ]);
  });

  it("cancels deleted rows and ignores a late failure", async () => {
    const pending = deferred();
    const recognize = vi
      .fn<RecognizeIngredient>()
      .mockReturnValue(pending.promise);
    const { user, unmount } = editor(recognize);
    await user.type(input(), "flour");
    await tick();
    await user.click(
      screen.getByRole("button", { name: "Remove ingredient 1" }),
    );
    expect(recognize.mock.calls[0][2].aborted).toBe(true);
    await act(async () => pending.reject(new Error("offline")));
    expect(screen.queryByText(/Couldn’t recognize/)).not.toBeInTheDocument();
    expect(input()).toBeEmptyDOMElement();
    await user.type(input(), "salt");
    await tick();
    unmount();
    expect(recognize.mock.calls[1][2].aborted).toBe(true);
  });

  it("does not request recognition during composition", async () => {
    const recognize = vi
      .fn<RecognizeIngredient>()
      .mockImplementation(async (raw, cursor) => recognized(raw, cursor));
    const { user } = editor(recognize);
    await user.click(input());
    // userEvent has no composition API; use native composition events.
    act(() => {
      input().dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true }),
      );
    });
    await user.type(input(), "小麦粉");
    await tick();
    expect(recognize).not.toHaveBeenCalled();
    act(() => {
      input().dispatchEvent(
        new CompositionEvent("compositionend", {
          bubbles: true,
          data: "小麦粉",
        }),
      );
    });
    await tick();
    expect(recognize).toHaveBeenCalledWith(
      "小麦粉",
      3,
      expect.any(AbortSignal),
      { choice: undefined, suggest: true },
    );
  });
});
