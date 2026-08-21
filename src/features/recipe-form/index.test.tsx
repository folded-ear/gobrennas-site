import {
  MockedProvider,
  type MockedProviderProps,
} from "@apollo/client/testing/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { CreateRecipeDocument } from "./__generated__/createRecipe.generated";
import { RecipeForm } from "./index";

type Mocks = MockedProviderProps["mocks"];

function renderForm({
  mocks = [],
  onSaved = vi.fn(),
  onCancel = vi.fn(),
}: {
  mocks?: Mocks;
  onSaved?: () => void;
  onCancel?: () => void;
} = {}) {
  render(
    <MockedProvider mocks={mocks}>
      <RecipeForm onSaved={onSaved} onCancel={onCancel} />
    </MockedProvider>,
  );
  return { onSaved, onCancel };
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));

/** The accessible error text actually associated with a field. */
function describedByText(field: HTMLElement) {
  return (field.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");
}

test("shows an inline error and does not submit when the title is blank", async () => {
  const { onSaved } = renderForm();

  click("Save");

  expect(
    await screen.findByText("A recipe title is required."),
  ).toBeInTheDocument();
  expect(onSaved).not.toHaveBeenCalled();
});

test("submits the trimmed values and reports the new recipe's id", async () => {
  const mocks = [
    {
      request: {
        query: CreateRecipeDocument,
        variables: {
          info: {
            type: "Recipe",
            name: "Tomato Soup",
            directions: "Simmer.",
            ingredients: [{ raw: "2 tomatoes" }],
            sections: [],
          },
        },
      },
      result: {
        data: {
          library: {
            __typename: "LibraryMutation",
            createRecipe: { __typename: "Recipe", id: "recipe-123" },
          },
        },
      },
    },
  ];
  const { onSaved } = renderForm({ mocks });

  type("Title", "  Tomato Soup  ");
  type("Ingredient 1", "2 tomatoes");
  type("Directions", "Simmer.");
  click("Save");

  await waitFor(() => expect(onSaved).toHaveBeenCalledWith("recipe-123"));
});

test("shows a banner and preserves input when the mutation fails", async () => {
  const mocks = [
    {
      request: {
        query: CreateRecipeDocument,
        variables: {
          info: {
            type: "Recipe",
            name: "Tomato Soup",
            directions: "",
            ingredients: [],
            sections: [],
          },
        },
      },
      error: new Error("network hiccup"),
    },
  ];
  renderForm({ mocks });

  type("Title", "Tomato Soup");
  click("Save");

  expect(await screen.findByText("Unable to save recipe")).toBeInTheDocument();
  expect(screen.getByLabelText("Title")).toHaveValue("Tomato Soup");
});

test("cancel does not submit", () => {
  const { onCancel } = renderForm();

  click("Cancel");

  expect(onCancel).toHaveBeenCalledOnce();
});

// Claim 1: one component serves both nesting levels.
test("the same ingredient list works at recipe and section level", () => {
  renderForm();

  click("Add Section");
  type("Ingredient 1", "2 tomatoes");
  type("Section 1 ingredient 1", "olive oil");
  click("Add Section 1 ingredient");

  expect(screen.getByLabelText("Ingredient 1")).toHaveValue("2 tomatoes");
  expect(screen.getByLabelText("Section 1 ingredient 1")).toHaveValue(
    "olive oil",
  );
  // adding within the section did not touch the recipe's own list
  expect(screen.getByLabelText("Section 1 ingredient 2")).toHaveValue("");
  expect(screen.queryByLabelText("Ingredient 2")).not.toBeInTheDocument();
});

// Claim 3: dotted paths + React Aria name matching land the error on the
// right field, with no per-field error wiring.
test("a nested validation error attaches to the offending section's field", async () => {
  const { onSaved } = renderForm();

  type("Title", "Tomato Soup");
  click("Add Section");
  click("Add Section");
  type("Section 1 title", "Dressing");
  click("Save");

  const blank = screen.getByLabelText("Section 2 title");
  await waitFor(() =>
    expect(describedByText(blank)).toContain("A section title is required."),
  );

  const filled = screen.getByLabelText("Section 1 title");
  expect(describedByText(filled)).not.toContain("A section title is required.");
  expect(filled).not.toHaveAttribute("aria-invalid", "true");
  expect(onSaved).not.toHaveBeenCalled();
});
