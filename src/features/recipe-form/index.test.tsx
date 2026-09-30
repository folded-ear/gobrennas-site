import { editableMorsel } from "@/features/morsel/test-helpers";
import { render, screen, userEvent, waitFor } from "@/test";
import { describe, expect, it, vi } from "vitest";
import { RecipeForm } from "./index";
import type { RecipeDraft } from "./recipe-draft";

const INITIAL_DRAFT: RecipeDraft = {
  title: "",
  sourceUrl: "",
  yieldServings: "",
  totalTimeText: "",
  caloriesPerServing: "",
  directions: "",
  ingredients: [{ clientId: "initial-ingredient", raw: "" }],
  sections: [],
  labels: [],
};

function renderRecipeForm(
  onSubmit: (draft: RecipeDraft) => Promise<void> = vi
    .fn()
    .mockResolvedValue(undefined),
  onCancel: () => void = vi.fn(),
) {
  render(
    <RecipeForm
      heading="Add Recipe"
      initialDraft={INITIAL_DRAFT}
      recognizeIngredient={async (raw, cursor) => ({ raw, cursor, ranges: [] })}
      onCancel={onCancel}
      onSubmit={onSubmit}
    />,
  );

  return { onCancel, onSubmit };
}

function createDeferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: () => resolvePromise?.(),
  };
}

describe("RecipeForm", () => {
  it("retains ingredient identities and text after failure and clears the alert on a row action", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn<(draft: RecipeDraft) => Promise<void>>()
      .mockRejectedValueOnce(new Error("Request failed"))
      .mockResolvedValueOnce(undefined);
    renderRecipeForm(onSubmit);
    await user.type(screen.getByRole("textbox", { name: "Title" }), "Bread");
    const first = editableMorsel("Ingredient 1");
    await user.type(first, "2 cups flour{Enter}");
    await user.type(editableMorsel("Ingredient 2"), "1 tsp salt");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn’t save recipe",
    );
    expect(first).toHaveTextContent("2 cups flour");
    expect(editableMorsel("Ingredient 2")).toHaveTextContent("1 tsp salt");
    const submittedRows = onSubmit.mock.calls[0][0].ingredients;

    await user.click(
      screen.getByRole("button", { name: "Move ingredient 2 up" }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1][0].ingredients).toMatchObject(
      [...submittedRows].reverse(),
    );
  });

  it("renders the recipe fields and actions without premature errors", () => {
    renderRecipeForm();

    expect(screen.getByRole("heading", { name: "Add Recipe" })).toBeVisible();
    expect(screen.getByRole("form", { name: "Recipe details" })).toBeVisible();
    const titleInput = screen.getByRole("textbox", { name: "Title" });
    expect(titleInput).toHaveValue("");
    expect(titleInput).toBeRequired();
    expect(titleInput).not.toHaveAttribute("aria-invalid", "true");
    const sourceUrlInput = screen.getByRole("textbox", { name: "Source URL" });
    expect(sourceUrlInput).toHaveValue("");
    expect(sourceUrlInput).toHaveAttribute("type", "url");
    expect(sourceUrlInput).toHaveAttribute("autocomplete", "url");
    const yieldInput = screen.getByRole("spinbutton", { name: "Yield" });
    expect(yieldInput).toHaveValue(null);
    expect(yieldInput).toHaveAttribute("min", "1");
    expect(yieldInput).toHaveAttribute("step", "1");
    const totalTimeInput = screen.getByRole("textbox", {
      name: "Total cook time",
    });
    expect(totalTimeInput).toHaveValue("");
    expect(
      screen.getByText("For example: 80 min or 1 hr 20 min."),
    ).toBeVisible();
    const caloriesInput = screen.getByRole("spinbutton", {
      name: "Calories per serving",
    });
    expect(caloriesInput).toHaveValue(null);
    expect(caloriesInput).toHaveAttribute("min", "0");
    expect(caloriesInput).toHaveAttribute("step", "1");
    expect(screen.getByRole("textbox", { name: "Directions" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    expect(
      screen.queryByText("A recipe title is required."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Enter a whole number of servings greater than 0."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Enter a time in minutes or hours and minutes, like 80 min or 1 hr 20 min.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Enter calories as a whole number of 0 or more."),
    ).not.toBeInTheDocument();
  });

  it.each(["", "   ", "\t\n "])(
    "disables Save recipe for a blank title (%j)",
    async (title) => {
      const user = userEvent.setup();
      const onSubmit = vi.fn<(draft: RecipeDraft) => Promise<void>>();
      renderRecipeForm(onSubmit);

      const titleInput = screen.getByRole("textbox", { name: "Title" });
      if (title.length > 0) {
        await user.type(titleInput, title);
      }
      const saveButton = screen.getByRole("button", { name: "Save recipe" });
      expect(saveButton).toBeDisabled();
      await user.click(saveButton);
      await user.click(titleInput);
      await user.keyboard("{Enter}");

      expect(onSubmit).not.toHaveBeenCalled();
    },
  );

  it("enables Save recipe for a title and disables it again when cleared", async () => {
    const user = userEvent.setup();
    renderRecipeForm();
    const titleInput = screen.getByRole("textbox", { name: "Title" });
    const saveButton = screen.getByRole("button", { name: "Save recipe" });

    await user.type(titleInput, "  Tomato soup  ");
    expect(saveButton).toBeEnabled();
    await user.clear(titleInput);
    expect(saveButton).toBeDisabled();
    await user.type(titleInput, "   ");
    expect(saveButton).toBeDisabled();
  });

  it("submits the complete controlled raw-string draft from Save recipe", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn<(draft: RecipeDraft) => Promise<void>>()
      .mockResolvedValue(undefined);
    renderRecipeForm(onSubmit);

    await user.type(screen.getByRole("textbox", { name: "Title" }), "Focaccia");
    await user.type(
      screen.getByRole("textbox", { name: "Source URL" }),
      "not a valid URL",
    );
    await user.type(screen.getByRole("spinbutton", { name: "Yield" }), "8");
    await user.type(
      screen.getByRole("textbox", { name: "Total cook time" }),
      "1 hr 20 min",
    );
    await user.type(
      screen.getByRole("spinbutton", { name: "Calories per serving" }),
      "320",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Directions" }),
      "Bake until golden.",
    );
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: "Focaccia",
        sourceUrl: "not a valid URL",
        yieldServings: "8",
        totalTimeText: "1 hr 20 min",
        caloriesPerServing: "320",
        directions: "Bake until golden.",
        ingredients: INITIAL_DRAFT.ingredients,
        sections: [],
        labels: [],
      });
    });
  });

  it("submits when Enter is pressed in Title", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn<(draft: RecipeDraft) => Promise<void>>()
      .mockResolvedValue(undefined);
    renderRecipeForm(onSubmit);

    await user.type(
      screen.getByRole("textbox", { name: "Title" }),
      "Cider chicken{Enter}",
    );

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: "Cider chicken",
        sourceUrl: "",
        yieldServings: "",
        totalTimeText: "",
        caloriesPerServing: "",
        directions: "",
        ingredients: [{ clientId: "initial-ingredient", raw: "" }],
        sections: [],
        labels: [],
      });
    });
  });

  it("adds a newline in Directions without submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(draft: RecipeDraft) => Promise<void>>();
    renderRecipeForm(onSubmit);

    const directions = screen.getByRole("textbox", { name: "Directions" });
    await user.type(directions, "Cook gently.{Enter}Serve warm.");

    expect(directions).toHaveValue("Cook gently.\nServe warm.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows all invalid metadata errors, keeps the draft from submitting, and focuses Yield first", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(draft: RecipeDraft) => Promise<void>>();
    renderRecipeForm(onSubmit);

    const yieldInput = screen.getByRole("spinbutton", { name: "Yield" });
    const totalTimeInput = screen.getByRole("textbox", {
      name: "Total cook time",
    });
    const caloriesInput = screen.getByRole("spinbutton", {
      name: "Calories per serving",
    });
    await user.type(
      screen.getByRole("textbox", { name: "Title" }),
      "Minestrone",
    );
    await user.type(yieldInput, "1.5");
    await user.type(totalTimeInput, "soon");
    await user.type(caloriesInput, "12.5");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(yieldInput).toHaveFocus();
    expect(yieldInput).toHaveAccessibleDescription(
      "Enter a whole number of servings greater than 0.",
    );
    expect(totalTimeInput).toHaveAccessibleDescription(
      "For example: 80 min or 1 hr 20 min. Enter a time in minutes or hours and minutes, like 80 min or 1 hr 20 min.",
    );
    expect(caloriesInput).toHaveAccessibleDescription(
      "Enter calories as a whole number of 0 or more.",
    );
  });

  it("clears only the metadata error for the field being corrected", async () => {
    const user = userEvent.setup();
    renderRecipeForm();

    const yieldInput = screen.getByRole("spinbutton", { name: "Yield" });
    const totalTimeInput = screen.getByRole("textbox", {
      name: "Total cook time",
    });
    const caloriesInput = screen.getByRole("spinbutton", {
      name: "Calories per serving",
    });
    await user.type(
      screen.getByRole("textbox", { name: "Title" }),
      "Minestrone",
    );
    await user.type(yieldInput, "1.5");
    await user.type(totalTimeInput, "soon");
    await user.type(caloriesInput, "12.5");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    await user.clear(yieldInput);
    await user.type(yieldInput, "4");

    expect(yieldInput).not.toHaveAccessibleDescription();
    expect(totalTimeInput).toHaveAccessibleDescription(
      "For example: 80 min or 1 hr 20 min. Enter a time in minutes or hours and minutes, like 80 min or 1 hr 20 min.",
    );
    expect(caloriesInput).toHaveAccessibleDescription(
      "Enter calories as a whole number of 0 or more.",
    );
  });

  it("blocks duplicate submission while saving and disables every control", async () => {
    const user = userEvent.setup();
    const deferred = createDeferred();
    const onSubmit = vi
      .fn<(draft: RecipeDraft) => Promise<void>>()
      .mockReturnValue(deferred.promise);
    renderRecipeForm(onSubmit);

    const titleInput = screen.getByRole("textbox", { name: "Title" });
    const sourceUrlInput = screen.getByRole("textbox", { name: "Source URL" });
    const yieldInput = screen.getByRole("spinbutton", { name: "Yield" });
    const totalTimeInput = screen.getByRole("textbox", {
      name: "Total cook time",
    });
    const caloriesInput = screen.getByRole("spinbutton", {
      name: "Calories per serving",
    });
    const directions = screen.getByRole("textbox", { name: "Directions" });
    const saveButton = screen.getByRole("button", { name: "Save recipe" });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.type(titleInput, "Baked potatoes");
    await user.click(saveButton);
    await user.click(saveButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("form", { name: "Recipe details" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(titleInput).toBeDisabled();
    expect(sourceUrlInput).toBeDisabled();
    expect(yieldInput).toBeDisabled();
    expect(totalTimeInput).toBeDisabled();
    expect(caloriesInput).toBeDisabled();
    expect(directions).toBeDisabled();
    expect(editableMorsel("Ingredient 1")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(editableMorsel("Ingredient 1")).toHaveAttribute(
      "contenteditable",
      "false",
    );
    for (const button of screen.getAllByRole("button", {
      name: /ingredient/i,
    })) {
      expect(button).toBeDisabled();
    }
    expect(screen.getByRole("button", { name: /Saving…/ })).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(screen.getByRole("status", { name: "Saving recipe" })).toBeVisible();

    deferred.resolve();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save recipe" })).toBeEnabled();
    });
  });

  it("preserves the draft after failure, clears the failure on edit, and permits retry", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn<(draft: RecipeDraft) => Promise<void>>()
      .mockRejectedValueOnce(new Error("Request failed"))
      .mockResolvedValueOnce(undefined);
    renderRecipeForm(onSubmit);

    const titleInput = screen.getByRole("textbox", { name: "Title" });
    const sourceUrlInput = screen.getByRole("textbox", { name: "Source URL" });
    const yieldInput = screen.getByRole("spinbutton", { name: "Yield" });
    const totalTimeInput = screen.getByRole("textbox", {
      name: "Total cook time",
    });
    const caloriesInput = screen.getByRole("spinbutton", {
      name: "Calories per serving",
    });
    const directions = screen.getByRole("textbox", { name: "Directions" });
    await user.type(titleInput, "Corn chowder");
    await user.type(sourceUrlInput, "https://example.test/corn-chowder");
    await user.type(yieldInput, "6");
    await user.type(totalTimeInput, "45 min");
    await user.type(caloriesInput, "290");
    await user.type(directions, "Simmer the vegetables.");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    const failureAlert = await screen.findByRole("alert");
    expect(failureAlert).toHaveTextContent("Couldn’t save recipe");
    expect(failureAlert).toHaveTextContent(
      "Your recipe is still here. Try saving again.",
    );
    expect(titleInput).toHaveValue("Corn chowder");
    expect(sourceUrlInput).toHaveValue("https://example.test/corn-chowder");
    expect(yieldInput).toHaveValue(6);
    expect(totalTimeInput).toHaveValue("45 min");
    expect(caloriesInput).toHaveValue(290);
    expect(directions).toHaveValue("Simmer the vegetables.");
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeEnabled();

    await user.clear(totalTimeInput);
    await user.type(totalTimeInput, "50 min");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });
  });

  it("calls onCancel from Cancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderRecipeForm(undefined, onCancel);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("tabs through the header actions and then the recipe fields", async () => {
    const user = userEvent.setup();
    renderRecipeForm();

    const titleInput = screen.getByRole("textbox", { name: "Title" });
    const sourceUrlInput = screen.getByRole("textbox", { name: "Source URL" });
    const yieldInput = screen.getByRole("spinbutton", { name: "Yield" });
    const totalTimeInput = screen.getByRole("textbox", {
      name: "Total cook time",
    });
    const caloriesInput = screen.getByRole("spinbutton", {
      name: "Calories per serving",
    });
    const directions = screen.getByRole("textbox", { name: "Directions" });
    const saveButton = screen.getByRole("button", { name: "Save recipe" });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.tab();
    expect(cancelButton).toHaveFocus();
    await user.tab();
    expect(titleInput).toHaveFocus();
    await user.type(titleInput, "Tomato soup");
    await user.tab({ shift: true });
    expect(cancelButton).toHaveFocus();
    await user.tab({ shift: true });
    expect(saveButton).toHaveFocus();
    await user.tab();
    expect(cancelButton).toHaveFocus();
    await user.tab();
    expect(titleInput).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: /Recipe labels/ })).toHaveFocus();
    await user.tab();
    expect(editableMorsel("Ingredient 1")).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole("button", { name: "Remove ingredient 1" }),
    ).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole("button", { name: "Add ingredient below 1" }),
    ).toHaveFocus();
    await user.tab();
    expect(sourceUrlInput).toHaveFocus();
    await user.tab();
    expect(yieldInput).toHaveFocus();
    await user.tab();
    expect(totalTimeInput).toHaveFocus();
    await user.tab();
    expect(caloriesInput).toHaveFocus();
    await user.tab();
    expect(directions).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Add section" })).toHaveFocus();
  });
});

describe("recipe label save lifecycle", () => {
  it("retains labels after a failed save, clears the failure on label editing, and disables label controls during retry", async () => {
    const user = userEvent.setup();
    const pending = createDeferred();
    const onSubmit = vi
      .fn<(draft: RecipeDraft) => Promise<void>>()
      .mockRejectedValueOnce(new Error("Offline"))
      .mockImplementationOnce(() => pending.promise);
    renderRecipeForm(onSubmit);
    await user.type(
      screen.getByRole("textbox", { name: "Title" }),
      "Lentil soup",
    );
    await user.click(screen.getByRole("button", { name: /Recipe labels/ }));
    await user.type(
      screen.getByRole("searchbox", { name: "Search recipe labels" }),
      "Weeknight{ArrowDown}{Enter}{Escape}",
    );
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn’t save recipe",
    );
    expect(screen.getByRole("row", { name: "Weeknight" })).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Remove tag Weeknight" }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Recipe labels/ }));
    await user.type(
      screen.getByRole("searchbox", { name: "Search recipe labels" }),
      "Vegetarian{ArrowDown}{Enter}{Escape}",
    );
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Recipe labels/ }),
      ).toBeDisabled(),
    );
    expect(
      screen.getByRole("button", { name: "Remove tag Vegetarian" }),
    ).toBeDisabled();
    expect(onSubmit.mock.calls[1][0].labels).toEqual(["Vegetarian"]);
    pending.resolve();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Recipe labels/ }),
      ).toBeEnabled(),
    );
  });
});
