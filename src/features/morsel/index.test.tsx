import { act, render, screen, userEvent, within } from "@/test";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { readSelection } from "./editor-dom";
import { Morsel, type MorselProps } from "./index";
import { editableMorsel, withTextInsertion } from "./test/editing";
import type { MorselSuggestions } from "./types";

const suggestions: MorselSuggestions = {
  raw: "1 cup fl, sifted",
  cursor: 8,
  options: [
    {
      food: { id: "pantry", name: "flour", kind: "Pantry item" },
      replacement: "flour",
      target: { start: 6, end: 8 },
    },
    {
      food: {
        id: "recipe",
        name: "flour mix",
        kind: "Recipe",
        detail: "10 minutes",
      },
      replacement: "flour mix",
      target: { start: 6, end: 8 },
    },
    {
      food: { id: "section", name: "flour coating", kind: "Section" },
      replacement: "flour coating",
      target: { start: 6, end: 8 },
    },
  ],
};

function Editor(props: Partial<MorselProps> = {}) {
  const [raw, setRaw] = useState(suggestions.raw);
  const [choice, setChoice] = useState("");
  return (
    <>
      <Morsel
        value={raw}
        label="Ingredient"
        suggestions={suggestions}
        onChange={setRaw}
        onChoose={(value, _cursor, selected) => {
          setRaw(value);
          setChoice(selected.food.id);
        }}
        {...props}
      />
      <output aria-label="Selected ingredient">{choice}</output>
      <button>Next</button>
    </>
  );
}

async function focusAtQuery(user: ReturnType<typeof userEvent.setup>) {
  const input = editableMorsel("Ingredient");
  await user.click(input);
  await user.keyboard("{Home}{ArrowRight>8/}");
  return input;
}

withTextInsertion();

describe("Morsel", () => {
  it("groups suggestions and accepts an explicitly active option without adding quotes or changing surrounding text", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    render(<Editor onKeyDown={onKeyDown} />);
    const input = await focusAtQuery(user);
    expect(screen.getByRole("group", { name: "Pantry item" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Recipe" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Section" })).toBeVisible();
    expect(input).not.toHaveAttribute("aria-activedescendant");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: "flour mix 10 minutes" }).id,
    );
    onKeyDown.mockClear();
    await user.keyboard("{Enter}");
    expect(input.textContent).toBe("1 cup flour mix, sifted");
    expect(readSelection(input)).toEqual({ start: 15, end: 15 });
    expect(input).toHaveFocus();
    expect(screen.getByLabelText("Selected ingredient")).toHaveTextContent(
      "recipe",
    );
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it("keeps focus and identity when selecting a section with the pointer", async () => {
    const user = userEvent.setup();
    render(<Editor />);
    const input = await focusAtQuery(user);
    await user.click(
      within(screen.getByRole("group", { name: "Section" })).getByRole(
        "option",
      ),
    );
    expect(input.textContent).toBe("1 cup flour coating, sifted");
    expect(input).toHaveFocus();
    expect(screen.getByLabelText("Selected ingredient")).toHaveTextContent(
      "section",
    );
  });

  it("lets Enter reach the row action when no suggestion is active and Tab leaves without choosing", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    render(<Editor onKeyDown={onKeyDown} />);
    const input = await focusAtQuery(user);
    onKeyDown.mockClear();
    await user.keyboard("{Enter}");
    expect(onKeyDown).toHaveBeenCalledOnce();
    expect(input.textContent).toBe(suggestions.raw);
    await user.keyboard("{ArrowDown}{Tab}");
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
    expect(screen.getByLabelText("Selected ingredient")).toBeEmptyDOMElement();
  });

  it("keeps Escape dismissal when a pending response arrives and reopens with ArrowDown", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Editor suggestions={undefined} />);
    const input = await focusAtQuery(user);
    await user.keyboard("{Escape}");
    rerender(<Editor suggestions={suggestions} />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox")).toBeVisible();
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("hides old suggestions as soon as text or cursor changes", async () => {
    const user = userEvent.setup();
    render(<Editor />);
    const input = await focusAtQuery(user);
    await user.keyboard("{ArrowLeft}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("listbox")).toBeVisible();
    await user.keyboard("o");
    expect(input.textContent).toBe("1 cup flo, sifted");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ignores suggestion shortcuts during composition", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    render(<Editor onKeyDown={onKeyDown} />);
    const input = await focusAtQuery(user);
    onKeyDown.mockClear();
    act(() =>
      input.dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true }),
      ),
    );
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Selected ingredient")).toBeEmptyDOMElement();
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it("preserves current text and reports an invalid replacement range", async () => {
    const user = userEvent.setup();
    render(
      <Editor
        suggestions={{
          ...suggestions,
          options: [
            { ...suggestions.options[0], target: { start: 6, end: 100 } },
          ],
        }}
      />,
    );
    const input = await focusAtQuery(user);
    await user.keyboard("{ArrowDown}{Enter}");
    expect(input.textContent).toBe(suggestions.raw);
    expect(screen.getByRole("alert")).toHaveTextContent("out of date");
    expect(screen.getByLabelText("Selected ingredient")).toBeEmptyDOMElement();
  });

  it("pastes plain text as one logical line when the consumer does not split rows", async () => {
    const user = userEvent.setup();
    render(<Editor />);
    const input = await focusAtQuery(user);
    await user.clear(input);
    await user.paste("1 cup flour\r\n2 eggs");
    expect(input.textContent).toBe("1 cup flour 2 eggs");
  });
});
