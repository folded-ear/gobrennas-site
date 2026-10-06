import {
  editableMorsel,
  withTextInsertion,
} from "@/features/morsel/test/editing";
import { act, render, screen, userEvent } from "@/test";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { newIngredientDraft } from "./ingredient-draft";
import { IngredientRows } from "./ingredient-rows";
import { createRecognitionQueue } from "./recognition-queue";

const recognize = async (raw: string, cursor: number) => ({
  raw,
  cursor,
  ranges: [],
});

function Editor({ lines = [""] }: { lines?: string[] }) {
  const [queue] = useState(createRecognitionQueue);
  const [rows, setRows] = useState(() => lines.map(newIngredientDraft));
  return (
    <IngredientRows
      rows={rows}
      queue={queue}
      onChange={setRows}
      isDisabled={false}
      recognize={recognize}
    />
  );
}

function ingredient(number: number) {
  return editableMorsel(`Ingredient ${number}`);
}

withTextInsertion();

describe("IngredientRows", () => {
  it("adds a row for a mobile line-break intent without inserting a newline", async () => {
    const user = userEvent.setup();
    render(<Editor lines={["flour"]} />);
    await user.click(ingredient(1));
    const event = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "insertParagraph",
    });
    act(() => {
      ingredient(1).dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(ingredient(1).textContent).toBe("flour");
    expect(ingredient(2)).toHaveFocus();
  });

  it("renders raw lines and accessible editing controls", () => {
    render(<Editor lines={["2 cups flour", "1 tsp salt"]} />);
    expect(screen.getByRole("group", { name: "Ingredients" })).toBeVisible();
    expect(ingredient(1)).toHaveTextContent("2 cups flour");
    expect(ingredient(2)).toHaveTextContent("1 tsp salt");
    expect(
      screen.getByRole("button", { name: "Move ingredient 1 up" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move ingredient 2 down" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Add ingredient below 1" }),
    ).toBeEnabled();
  });

  it.each(["Enter", "plus button"])(
    "inserts and focuses a row below the current row using %s without submitting",
    async (action) => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: React.FormEvent) =>
        event.preventDefault(),
      );
      render(
        <form onSubmit={onSubmit}>
          <Editor lines={["flour", "salt"]} />
          <button type="submit">Save</button>
        </form>,
      );

      if (action === "Enter") {
        await user.click(ingredient(1));
        await user.keyboard("{Enter}");
      } else {
        await user.click(
          screen.getByRole("button", { name: "Add ingredient below 1" }),
        );
      }

      expect(screen.getAllByRole("combobox")).toHaveLength(3);
      expect(ingredient(2)).toBeEmptyDOMElement();
      expect(ingredient(2)).toHaveFocus();
      expect(ingredient(3)).toHaveTextContent("salt");
      expect(onSubmit).not.toHaveBeenCalled();
      await user.type(ingredient(2), "1 cup water");
      expect(ingredient(2)).toHaveTextContent("1 cup water");
    },
  );

  it("adds a row from the button and reorders it with focus following the same input", async () => {
    const user = userEvent.setup();
    render(<Editor lines={["flour"]} />);
    await user.click(
      screen.getByRole("button", { name: "Add ingredient below 1" }),
    );
    const added = ingredient(2);
    expect(added).toHaveFocus();
    await user.type(added, "salt");
    await user.click(
      screen.getByRole("button", { name: "Move ingredient 2 up" }),
    );
    expect(ingredient(1)).toBe(added);
    expect(added).toHaveTextContent("salt");
    expect(added).toHaveFocus();
    await user.click(
      screen.getByRole("button", { name: "Move ingredient 1 down" }),
    );
    expect(ingredient(2)).toBe(added);
    expect(added).toHaveFocus();
  });

  it.each(["Backspace", "Delete"])(
    "removes empty rows with %s and focuses a neighbor or fresh placeholder",
    async (key) => {
      const user = userEvent.setup();
      render(<Editor lines={["flour", "  ", "salt"]} />);
      await user.click(ingredient(2));
      await user.keyboard(`{${key}}`);
      expect(screen.getAllByRole("combobox")).toHaveLength(2);
      expect(ingredient(1)).toHaveFocus();
      expect(ingredient(2)).toHaveTextContent("salt");

      await user.clear(ingredient(1));
      await user.keyboard(`{${key}}`);
      expect(ingredient(1)).toHaveTextContent("salt");
      expect(ingredient(1)).toHaveFocus();
      await user.clear(ingredient(1));
      await user.keyboard(`{${key}}`);
      expect(screen.getAllByRole("combobox")).toHaveLength(1);
      expect(ingredient(1)).toBeEmptyDOMElement();
      expect(ingredient(1)).toHaveFocus();
    },
  );

  it("deletes text normally in populated rows and removes a populated row with its button", async () => {
    const user = userEvent.setup();
    render(<Editor lines={["flour", "salt"]} />);
    await user.click(ingredient(1));
    await user.keyboard("{End}{Backspace}{Home}{Delete}");
    expect(ingredient(1)).toHaveTextContent("lou");
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    await user.click(
      screen.getByRole("button", { name: "Remove ingredient 1" }),
    );
    expect(ingredient(1)).toHaveTextContent("salt");
    expect(ingredient(1)).toHaveFocus();
  });

  it("pastes nonblank lines into separate rows and keeps the surrounding rows", async () => {
    const user = userEvent.setup();
    render(<Editor lines={["flour", "", "salt"]} />);
    const original = ingredient(2);
    await user.click(original);
    await user.paste("2 eggs\r\n \r\n 1 cup milk \n");
    expect(screen.getAllByRole("combobox")).toHaveLength(4);
    expect(ingredient(1)).toHaveTextContent("flour");
    expect(ingredient(2)).toBe(original);
    expect(ingredient(2)).toHaveTextContent("2 eggs");
    expect(ingredient(3).textContent).toBe(" 1 cup milk ");
    expect(ingredient(3)).toHaveFocus();
    expect(ingredient(4)).toHaveTextContent("salt");
  });

  it("replaces the selected text on paste and preserves text outside the selection", async () => {
    const user = userEvent.setup();
    render(<Editor lines={["2 cups rice, rinsed"]} />);
    await user.click(ingredient(1));
    await user.pointer([
      { keys: "[MouseLeft>]", target: ingredient(1), offset: 7 },
      { offset: 11 },
      { keys: "[/MouseLeft]" },
    ]);
    await user.paste("flour\n1 cup lentils");
    expect(ingredient(1)).toHaveTextContent("2 cups flour");
    expect(ingredient(2)).toHaveTextContent("1 cup lentils, rinsed");
    expect(ingredient(2)).toHaveFocus();
  });

  it("keeps ordinary single-line paste and ignores an all-blank multiline paste", async () => {
    const user = userEvent.setup();
    render(<Editor />);
    await user.click(ingredient(1));
    await user.paste("\n \r\n");
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    expect(ingredient(1)).toBeEmptyDOMElement();
    await user.paste("2 cups flour");
    expect(ingredient(1)).toHaveTextContent("2 cups flour");
  });

  it("does not treat an IME confirmation as an instruction to add a row", async () => {
    const user = userEvent.setup();
    render(<Editor lines={["小麦粉"]} />);
    await user.click(ingredient(1));
    // userEvent has no composition API; dispatch the native IME key event.
    act(() => {
      ingredient(1).dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          isComposing: true,
          bubbles: true,
        }),
      );
    });
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    expect(ingredient(1)).toHaveTextContent("小麦粉");
  });
});
