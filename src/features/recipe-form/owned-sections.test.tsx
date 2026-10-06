import { RecognizedRangeType } from "@/__generated__/graphql";
import { withTextInsertion } from "@/features/morsel/test/editing";
import { act, render, screen, userEvent, waitFor, within } from "@/test";
import { describe, expect, it, vi } from "vitest";
import { RecipeForm } from "./index";
import type {
  IngredientRecognition,
  RecognizeIngredient,
} from "./ingredient-recognition";
import { newRecipeDraft, type RecipeDraft } from "./recipe-draft";
import { newSectionDraft, type SectionDraft } from "./section-draft";

const recognize: RecognizeIngredient = async (raw, cursor) => ({
  raw,
  cursor,
  ranges: [],
});

function editor(
  sections: SectionDraft[] = [],
  recognizeIngredient = recognize,
) {
  const user = userEvent.setup();
  const submit = vi
    .fn<(draft: RecipeDraft) => Promise<void>>()
    .mockResolvedValue(undefined);
  render(
    <RecipeForm
      heading="Add Recipe"
      initialDraft={{ ...newRecipeDraft(), title: "Pie", sections }}
      onSubmit={submit}
      onCancel={vi.fn()}
      recognizeIngredient={recognizeIngredient}
    />,
  );
  return { user, submit };
}

function ingredient(sectionNumber: number, number = 1) {
  const input = screen.getByRole("combobox", {
    name: `Section ${sectionNumber} ingredient ${number}`,
  });
  // user-event does not yet support plaintext-only contenteditables.
  input.setAttribute("contenteditable", "true");
  return input;
}

withTextInsertion();

describe("owned sections", () => {
  it("names section inputs, row actions, and recognition retries without needing group context", async () => {
    const { user } = editor(
      [newSectionDraft(), newSectionDraft()],
      vi.fn<RecognizeIngredient>().mockRejectedValue(new Error("Offline")),
    );
    expect(
      screen.getByRole("combobox", { name: "Ingredient 1" }),
    ).toBeVisible();
    for (const number of [1, 2]) {
      await user.type(ingredient(number), "flour");
      for (const name of [
        `Move section ${number} ingredient 1 up`,
        `Move section ${number} ingredient 1 down`,
        `Remove section ${number} ingredient 1`,
        `Add section ${number} ingredient below 1`,
      ]) {
        expect(screen.getByRole("button", { name })).toBeVisible();
      }
      expect(
        await screen.findByRole("button", {
          name: `Retry recognition for section ${number} ingredient 1`,
        }),
      ).toBeVisible();
    }
  });

  it.each(["", "   "])(
    "removes a newly added section containing only %j without confirmation",
    async (blank) => {
      const { user } = editor();
      await user.click(screen.getByRole("button", { name: "Add section" }));
      if (blank) {
        await user.type(
          screen.getByRole("textbox", { name: "Section 1 title" }),
          blank,
        );
        await user.type(
          screen.getByRole("textbox", { name: "Section 1 directions" }),
          blank,
        );
        await user.type(ingredient(1), blank);
      }
      await user.click(
        screen.getByRole("button", {
          name: "Add section 1 ingredient below 1",
        }),
      );
      await user.click(
        screen.getByRole("button", { name: "Remove section 1" }),
      );
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("group", { name: "Section 1" }),
      ).not.toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Add section" }),
        ).toHaveFocus(),
      );
    },
  );

  it("adds multiple sections, focuses new titles, and validates each title inline before saving", async () => {
    const { user, submit } = editor();
    await user.click(screen.getByRole("button", { name: "Add section" }));
    const first = screen.getByRole("textbox", { name: "Section 1 title" });
    expect(first).toHaveFocus();
    expect(first).toBeRequired();
    expect(first).not.toHaveAttribute("aria-invalid", "true");
    await user.click(screen.getByRole("button", { name: "Add section" }));
    const second = screen.getByRole("textbox", { name: "Section 2 title" });
    expect(second).toHaveFocus();
    await user.type(first, "   ");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() => expect(first).toHaveFocus());
    expect(submit).not.toHaveBeenCalled();
    expect(first).toHaveAttribute("aria-invalid", "true");
    expect(first).toHaveAccessibleDescription("A section title is required.");
    expect(second).toHaveAccessibleDescription("A section title is required.");
    await user.type(first, "Crust");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() => expect(second).toHaveFocus());
    await user.type(second, "Filling");
    await user.type(
      screen.getByRole("textbox", { name: "Section 1 directions" }),
      "Mix and chill.",
    );
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    expect(submit.mock.calls[0][0].sections.map((s) => s.title.trim())).toEqual(
      ["Crust", "Filling"],
    );
  });

  it("reuses ingredient paste, reordering, and recognition within each section", async () => {
    const recognized: RecognizeIngredient = async (raw, cursor) => ({
      raw,
      cursor,
      ranges: [
        {
          start: 0,
          end: raw.length,
          type: RecognizedRangeType.ITEM,
          quantity: null,
          id: `pantry-${raw}`,
        },
      ],
    });
    const { user, submit } = editor(
      [
        { ...newSectionDraft(), title: "Crust" },
        { ...newSectionDraft(), title: "Filling" },
      ],
      recognized,
    );
    await user.click(ingredient(1));
    await user.paste("flour\nsalt");
    expect(ingredient(1, 2)).toHaveFocus();
    await waitFor(() =>
      expect(
        screen.getByLabelText("Recognition for section 1 ingredient 1"),
      ).toHaveTextContent("flour"),
    );
    await user.click(
      screen.getByRole("button", { name: "Move section 1 ingredient 2 up" }),
    );
    expect(ingredient(1)).toHaveTextContent("salt");
    await user.type(ingredient(2), "apples");
    await waitFor(() =>
      expect(
        screen.getByLabelText("Recognition for section 2 ingredient 1"),
      ).toHaveTextContent("apples"),
    );
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    const saved = submit.mock.calls[0][0].sections;
    expect(saved[0].ingredients.map((row) => row.raw)).toEqual([
      "salt",
      "flour",
    ]);
    expect(saved[1].ingredients[0].recognition?.ranges[0].id).toBe(
      "pantry-apples",
    );
  });

  it.each(["title", "directions", "ingredient"])(
    "confirms removal with %s content, preserves it on cancel, and retains the surviving section identity",
    async (content) => {
      const blank = newSectionDraft();
      const filling = {
        ...newSectionDraft(),
        id: "saved-filling",
        title: "Filling",
        directions: "Mix apples.",
      };
      const { user, submit } = editor([blank, filling]);
      const field =
        content === "ingredient"
          ? ingredient(1)
          : screen.getByRole("textbox", { name: `Section 1 ${content}` });
      await user.type(field, "Content");
      await user.click(
        screen.getByRole("button", { name: "Remove section 1" }),
      );
      let dialog = screen.getByRole("alertdialog", {
        name: "Remove this section?",
      });
      await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
      if (content === "ingredient") expect(field).toHaveTextContent("Content");
      else expect(field).toHaveValue("Content");
      await user.click(
        screen.getByRole("button", { name: "Remove section 1" }),
      );
      dialog = screen.getByRole("alertdialog", {
        name: "Remove this section?",
      });
      await user.click(
        within(dialog).getByRole("button", { name: "Remove section" }),
      );
      expect(
        screen.getByRole("textbox", { name: "Section 1 title" }),
      ).toHaveValue("Filling");
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Add section" }),
        ).toHaveFocus(),
      );
      await user.click(screen.getByRole("button", { name: "Save recipe" }));
      await waitFor(() => expect(submit).toHaveBeenCalledOnce());
      expect(submit.mock.calls[0][0].sections).toEqual([filling]);
    },
  );

  it("keeps a pending recognition attached to its section when an earlier section is removed", async () => {
    let resolve!: (value: IngredientRecognition) => void;
    const pending = new Promise<IngredientRecognition>((yes) => {
      resolve = yes;
    });
    const recognition = vi.fn<RecognizeIngredient>().mockReturnValue(pending);
    const crust = { ...newSectionDraft(), title: "Crust" };
    const filling = { ...newSectionDraft(), title: "Filling" };
    const { user, submit } = editor([crust, filling], recognition);
    await user.type(ingredient(2), "apples");
    await waitFor(() => expect(recognition).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Remove section 1" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Remove section",
      }),
    );
    await act(async () =>
      resolve({
        raw: "apples",
        cursor: 6,
        ranges: [
          {
            start: 0,
            end: 6,
            type: RecognizedRangeType.ITEM,
            id: "apples",
            quantity: null,
          },
        ],
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Recognition for section 1 ingredient 1"),
      ).toHaveTextContent("apples"),
    );
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    expect(submit.mock.calls[0][0].sections[0]).toMatchObject({
      clientId: filling.clientId,
      title: "Filling",
      ingredients: [
        { raw: "apples", recognition: { ranges: [{ id: "apples" }] } },
      ],
    });
  });
});
