import { render, screen, userEvent, waitFor } from "@/test";
import { describe, expect, it, vi } from "vitest";
import { RecipeForm } from "./index";
import { RecipeDraft } from "./recipe-draft";

const INITIAL_DRAFT: RecipeDraft = { title: "", directions: "" };

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
    expect(screen.getByRole("textbox", { name: "Directions" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    expect(
      screen.queryByText("A recipe title is required."),
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

  it("submits the controlled draft from Save recipe", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn<(draft: RecipeDraft) => Promise<void>>()
      .mockResolvedValue(undefined);
    renderRecipeForm(onSubmit);

    await user.type(screen.getByRole("textbox", { name: "Title" }), "Focaccia");
    await user.type(
      screen.getByRole("textbox", { name: "Directions" }),
      "Bake until golden.",
    );
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: "Focaccia",
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

  it("blocks duplicate submission while saving and disables every control", async () => {
    const user = userEvent.setup();
    const deferred = createDeferred();
    const onSubmit = vi
      .fn<(draft: RecipeDraft) => Promise<void>>()
      .mockReturnValue(deferred.promise);
    renderRecipeForm(onSubmit);

    const titleInput = screen.getByRole("textbox", { name: "Title" });
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
    const directions = screen.getByRole("textbox", { name: "Directions" });
    await user.type(titleInput, "Corn chowder");
    await user.type(directions, "Simmer the vegetables.");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    const failureAlert = await screen.findByRole("alert");
    expect(failureAlert).toHaveTextContent("Couldn’t save recipe");
    expect(failureAlert).toHaveTextContent(
      "Your recipe is still here. Try saving again.",
    );
    expect(titleInput).toHaveValue("Corn chowder");
    expect(directions).toHaveValue("Simmer the vegetables.");
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeEnabled();

    await user.type(directions, " Keep warm.");
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

  it("tabs from Title through Directions, Save recipe, and Cancel", async () => {
    const user = userEvent.setup();
    renderRecipeForm();

    const titleInput = screen.getByRole("textbox", { name: "Title" });
    const directions = screen.getByRole("textbox", { name: "Directions" });
    const saveButton = screen.getByRole("button", { name: "Save recipe" });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.tab();
    expect(titleInput).toHaveFocus();
    await user.tab();
    expect(directions).toHaveFocus();
    await user.tab();
    expect(saveButton).toHaveFocus();
    await user.tab();
    expect(cancelButton).toHaveFocus();
  });
});
