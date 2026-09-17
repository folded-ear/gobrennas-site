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
};

function renderRecipeForm(
  onSubmit: (draft: RecipeDraft) => Promise<void> = vi
    .fn()
    .mockResolvedValue(undefined),
  onCancel: () => void = vi.fn(),
) {
  render(
    <RecipeForm
      initialDraft={INITIAL_DRAFT}
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
  it("renders the recipe fields and actions without premature errors", () => {
    renderRecipeForm();

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
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeEnabled();
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
    "shows an accessible required-title error and focuses Title for whitespace-only input (%j)",
    async (title) => {
      const user = userEvent.setup();
      const onSubmit = vi.fn<(draft: RecipeDraft) => Promise<void>>();
      renderRecipeForm(onSubmit);

      const titleInput = screen.getByRole("textbox", { name: "Title" });
      if (title.length > 0) {
        await user.type(titleInput, title);
      }
      await user.click(screen.getByRole("button", { name: "Save recipe" }));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(titleInput).toHaveFocus();
      expect(titleInput).toHaveAccessibleErrorMessage(
        "A recipe title is required.",
      );
    },
  );

  it("clears the title error as the person corrects the title", async () => {
    const user = userEvent.setup();
    renderRecipeForm();

    const titleInput = screen.getByRole("textbox", { name: "Title" });
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(titleInput).toHaveAccessibleErrorMessage(
      "A recipe title is required.",
    );

    await user.type(titleInput, "Tomato soup");

    expect(titleInput).not.toHaveAccessibleErrorMessage();
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
    expect(yieldInput).toHaveAccessibleErrorMessage(
      "Enter a whole number of servings greater than 0.",
    );
    expect(totalTimeInput).toHaveAccessibleErrorMessage(
      "Enter a time in minutes or hours and minutes, like 80 min or 1 hr 20 min.",
    );
    expect(caloriesInput).toHaveAccessibleErrorMessage(
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

    expect(yieldInput).not.toHaveAccessibleErrorMessage();
    expect(totalTimeInput).toHaveAccessibleErrorMessage(
      "Enter a time in minutes or hours and minutes, like 80 min or 1 hr 20 min.",
    );
    expect(caloriesInput).toHaveAccessibleErrorMessage(
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

  it("tabs from Title through every field, Save recipe, and Cancel", async () => {
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
    expect(titleInput).toHaveFocus();
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
    expect(saveButton).toHaveFocus();
    await user.tab();
    expect(cancelButton).toHaveFocus();
  });
});
