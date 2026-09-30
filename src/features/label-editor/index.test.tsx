import { render, screen, userEvent, within } from "@/test";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { LabelEditor, type LabelSuggestions } from "./index";

const suggestions: LabelSuggestions = {
  labels: ["Weeknight", "Vegetarian", "Freezer-friendly"],
  isLoading: false,
  hasError: false,
  onRetry: () => {},
};

function Editor({
  initial = [],
  options = suggestions,
  disabled = false,
}: {
  initial?: string[];
  options?: LabelSuggestions;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <LabelEditor
      value={value}
      onChange={setValue}
      suggestions={options}
      isDisabled={disabled}
    />
  );
}

const trigger = () => screen.getByRole("button", { name: /Recipe labels/ });
const input = () =>
  screen.getByRole("searchbox", { name: "Search recipe labels" });
const addedLabels = () =>
  screen.getByRole("grid", { name: "Added recipe labels" });

describe("LabelEditor", () => {
  it("filters suggestions and selects multiple labels without closing the menu", async () => {
    const user = userEvent.setup();
    render(<Editor />);
    expect(screen.getByText("Select labels")).toBeVisible();
    await user.click(trigger());
    await user.type(input(), "veg");
    expect(
      screen.queryByRole("option", { name: "Weeknight" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Vegetarian" }));
    expect(input()).toHaveValue("");
    expect(screen.getByRole("option", { name: "Vegetarian" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.click(screen.getByRole("option", { name: "Weeknight" }));
    await user.keyboard("{Escape}");
    expect(within(addedLabels()).getByText("Vegetarian")).toBeVisible();
    expect(within(addedLabels()).getByText("Weeknight")).toBeVisible();
  });

  it("opens and selects an existing label with the keyboard without submitting the recipe", async () => {
    const user = userEvent.setup();
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <Editor />
        <button type="submit">Save</button>
      </form>,
    );
    await user.tab();
    expect(trigger()).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.type(input(), "veg");
    await user.keyboard("{ArrowDown}{Enter}{Escape}");
    expect(within(addedLabels()).getByText("Vegetarian")).toBeVisible();
    expect(submit).not.toHaveBeenCalled();
  });

  it("previews the sanitized name and creates it with a pointer", async () => {
    const user = userEvent.setup();
    render(<Editor />);
    await user.click(trigger());
    await user.type(input(), " Lunch//Dinner ");
    expect(screen.getByRole("status")).toHaveTextContent("No matching labels");
    await user.click(
      screen.getByRole("option", { name: "Create “Lunch-Dinner”" }),
    );
    await user.keyboard("{Escape}");
    expect(within(addedLabels()).getByText("Lunch-Dinner")).toBeVisible();
  });

  it("creates free-form labels with Enter and prevents case or slash-normalized duplicates", async () => {
    const user = userEvent.setup();
    render(<Editor />);
    await user.click(trigger());
    await user.type(input(), "Batch//Cooking{ArrowDown}{Enter}");
    expect(
      screen.getByRole("option", { name: "Batch-Cooking" }),
    ).toHaveAttribute("aria-selected", "true");
    await user.type(input(), "batch/cooking");
    expect(screen.getByRole("status")).toHaveTextContent("already added");
    expect(
      screen.queryByRole("option", { name: /Create/ }),
    ).not.toBeInTheDocument();
    await user.keyboard("{Enter}{Escape}");
    expect(within(addedLabels()).getAllByRole("row")).toHaveLength(1);
  });

  it("uses the existing label's casing when Enter adds an exact match", async () => {
    const user = userEvent.setup();
    render(<Editor />);
    await user.click(trigger());
    await user.type(input(), "vegetarian{ArrowDown}{Enter}{Escape}");
    expect(within(addedLabels()).getByText("Vegetarian")).toBeVisible();
  });

  it("removes labels with pointer and keyboard input without opening the menu", async () => {
    const user = userEvent.setup();
    render(<Editor initial={["Vegetarian", "Weeknight"]} />);
    await user.click(
      within(addedLabels()).getByRole("button", {
        name: "Remove tag Vegetarian",
      }),
    );
    expect(
      within(addedLabels()).queryByText("Vegetarian"),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    await user.click(
      within(addedLabels()).getByRole("row", { name: "Weeknight" }),
    );
    await user.keyboard("{Delete}");
    expect(screen.getByText("Select labels")).toBeVisible();
  });

  it("can deselect an option or clear all selected labels", async () => {
    const user = userEvent.setup();
    render(<Editor initial={["Vegetarian", "Weeknight"]} />);
    await user.click(trigger());
    await user.click(screen.getByRole("option", { name: "Vegetarian" }));
    expect(screen.getByRole("option", { name: "Vegetarian" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    await user.keyboard("{Escape}");
    await user.click(
      screen.getByRole("button", { name: "Clear recipe labels" }),
    );
    expect(screen.getByText("Select labels")).toBeVisible();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("allows creation while suggestions load and ignores whitespace-only input", async () => {
    const user = userEvent.setup();
    render(
      <Editor options={{ ...suggestions, labels: [], isLoading: true }} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading label suggestions",
    );
    await user.click(trigger());
    await user.type(input(), "   {Enter}");
    expect(
      screen.queryByRole("option", { name: /Create/ }),
    ).not.toBeInTheDocument();
    await user.clear(input());
    await user.type(input(), "Family favorite{ArrowDown}{Enter}{Escape}");
    expect(within(addedLabels()).getByText("Family favorite")).toBeVisible();
  });

  it("offers retry after a suggestion error while allowing label creation", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <Editor
        options={{ ...suggestions, labels: [], hasError: true, onRetry }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Couldn’t load label suggestions",
    );
    await user.click(
      screen.getByRole("button", { name: "Retry label suggestions" }),
    );
    expect(onRetry).toHaveBeenCalledOnce();
    await user.click(trigger());
    await user.type(input(), "Picnic{ArrowDown}{Enter}{Escape}");
    expect(within(addedLabels()).getByText("Picnic")).toBeVisible();
  });

  it("explains an empty library", () => {
    render(<Editor options={{ ...suggestions, labels: [] }} />);
    expect(screen.getByRole("status")).toHaveTextContent("No labels yet");
  });

  it("disables selection, removal, and clearing while saving", async () => {
    const user = userEvent.setup();
    render(<Editor initial={["Weeknight"]} disabled />);
    expect(trigger()).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Clear recipe labels" }),
    ).toBeDisabled();
    const remove = within(addedLabels()).getByRole("button", {
      name: "Remove tag Weeknight",
    });
    expect(remove).toBeDisabled();
    await user.click(remove);
    expect(within(addedLabels()).getByText("Weeknight")).toBeVisible();
  });
});
