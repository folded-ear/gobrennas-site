import { RecognizedRangeType as Type } from "@/__generated__/graphql";
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

function editor(recognize: RecognizeIngredient, lines = [""]) {
  const submit = vi
    .fn<(draft: RecipeDraft) => Promise<void>>()
    .mockResolvedValue(undefined);
  const view = render(
    <RecipeForm
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
const input = (number = 1) =>
  screen.getByRole("textbox", { name: `Ingredient ${number}` });

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
    await tick(1);
    expect(recognize).toHaveBeenCalledWith(
      "2 _cups_ “flour”, sifted",
      24,
      expect.any(AbortSignal),
    );
    expect(screen.getByText("Quantity")).toBeVisible();
    expect(screen.getByText("New unit")).toBeVisible();
    expect(screen.getByText("New ingredient")).toBeVisible();
    expect(screen.getByText("Preparation")).toBeVisible();
    expect(screen.getByText("sifted")).toBeVisible();
    expect(input()).toHaveFocus();
    expect(input()).toHaveValue("2 _cups_ “flour”, sifted");
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
    );
    await act(async () => latest.resolve(recognized("flour", 0)));
    expect(screen.getByText("Ingredient", { exact: true })).toBeVisible();
    expect(input()).toHaveProperty("selectionStart", 0);
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
    expect(input()).toHaveValue("salt");
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
      .mockReturnValueOnce(flour.promise)
      .mockReturnValueOnce(salt.promise);
    const { user, submit } = editor(recognize, ["flour", "salt"]);
    await user.click(input(1));
    await tick();
    await user.click(input(2));
    await tick();
    await user.click(
      screen.getByRole("button", { name: "Move ingredient 2 up" }),
    );
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
    expect(input()).toHaveValue("");
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
    );
  });
});
