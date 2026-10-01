import { RecognizedRangeType } from "@/__generated__/graphql";
import { selectRange } from "@/features/morsel/editor-dom";
import {
  RecognizeIngredientDocument,
  type RecognizeIngredientQuery,
} from "@/features/recipe-form/__generated__/recognizeIngredient.generated";
import { render, screen, userEvent, waitFor } from "@/test";
import { MockLink } from "@apollo/client/testing";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { IngredientNameEditor } from "./ingredient-name-editor";
import { rowKeymap } from "./keymap";

const RAW = "2 cups flour";
const LABEL = "Name of 2 cups flour";

function recognized(
  raw = RAW,
  delay = 0,
  cursor = raw.length,
): MockLink.MockedResponse {
  return {
    request: {
      query: RecognizeIngredientDocument,
      variables: { raw, cursor, choice: null, suggest: false },
    },
    delay,
    result: {
      data: {
        library: {
          __typename: "LibraryQuery",
          recognizeItem: {
            __typename: "RecognizedItem",
            raw,
            cursor,
            ranges: [
              {
                __typename: "RecognizedRange",
                start: 0,
                end: 1,
                type: RecognizedRangeType.QUANTITY,
                quantity: Number(raw[0]),
                id: null,
              },
              {
                __typename: "RecognizedRange",
                start: 2,
                end: 6,
                type: RecognizedRangeType.UNIT,
                quantity: null,
                id: "cup",
              },
              {
                __typename: "RecognizedRange",
                start: 7,
                end: 12,
                type: RecognizedRangeType.ITEM,
                quantity: null,
                id: "flour",
              },
            ],
          },
        },
      } satisfies RecognizeIngredientQuery,
    },
  };
}

function setup({
  raw = RAW,
  mocks = [recognized()],
  caret = "end" as "start" | "end",
} = {}) {
  const split = vi.fn();
  const remove = vi.fn();
  function Host() {
    const [finished, setFinished] = useState<string>();
    return (
      <>
        {finished === undefined ? (
          <IngredientNameEditor
            initialText={raw}
            caret={caret}
            keymap={rowKeymap({
              split,
              remove,
              cancel: () => setFinished("Cancelled"),
              hasChildren: false,
            })}
            label={LABEL}
            editKey="item-42"
            onChange={() => {}}
            onEnd={(text) => setFinished(`Saved: ${text}`)}
          />
        ) : (
          <p>{finished}</p>
        )}
        <button type="button">Elsewhere</button>
      </>
    );
  }
  const user = userEvent.setup();
  render(<Host />, { mocks });
  const field = screen.getByRole("textbox", { name: LABEL });
  // user-event 14 does not recognize plaintext-only contenteditables yet.
  field.setAttribute("contenteditable", "true");
  return { user, field, split, remove };
}

describe("IngredientNameEditor", () => {
  it("recognizes the existing text without offering suggestions or moving focus", async () => {
    const { field } = setup();

    await waitFor(() =>
      expect(field).toHaveAccessibleDescription(
        /quantity: 2\. unit: cups\. ingredient: flour/,
      ),
    );

    expect(field).toHaveTextContent(RAW);
    expect(field).toHaveFocus();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("saves edited text when focus leaves while recognition is still pending", async () => {
    const { user, field } = setup({ mocks: [recognized(RAW, 1000)] });
    await user.clear(field);
    await user.type(field, "3 cups flour");
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));

    expect(await screen.findByText("Saved: 3 cups flour")).toBeVisible();
  });

  it("keeps text editable and saveable when recognition fails", async () => {
    const mock = recognized();
    const { user, field } = setup({
      mocks: [{ request: mock.request, error: new Error("Offline"), delay: 0 }],
    });
    expect(
      await screen.findByText(/Couldn’t highlight this ingredient/),
    ).toBeVisible();

    await user.type(field, ", sifted");
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));

    expect(
      await screen.findByText("Saved: 2 cups flour, sifted"),
    ).toBeVisible();
  });

  it("cancels with Escape instead of swallowing it as a suggestion key", async () => {
    const { user, field } = setup();
    await user.type(field, ", sifted");
    await user.keyboard("{Escape}");

    expect(screen.getByText("Cancelled")).toBeVisible();
    expect(screen.queryByText(/^Saved:/)).not.toBeInTheDocument();
  });

  it("adds one row on Enter and preserves modified Enter", async () => {
    const { user, split } = setup();
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(split).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");
    expect(split.mock.calls).toEqual([[false]]);
  });

  it("adds above when Enter is pressed at the start", async () => {
    const { user, split } = setup({ caret: "start" });
    await user.keyboard("{Enter}");

    expect(split.mock.calls).toEqual([[true]]);
  });

  it("skips recognition with a leading exclamation mark and recognizes once it is removed", async () => {
    const { user, field } = setup({
      raw: `!${RAW}`,
      mocks: [recognized(RAW, 0, 0)],
    });
    expect(field).toHaveAttribute("aria-busy", "false");
    expect(field).not.toHaveAccessibleDescription(/quantity: 2/);

    selectRange(field, { start: 0, end: 1 });
    await user.keyboard("{Backspace}");

    expect(field).toHaveTextContent(RAW);
    await waitFor(() =>
      expect(field).toHaveAccessibleDescription(/ingredient: flour/),
    );
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(await screen.findByText(`Saved: ${RAW}`)).toBeVisible();
  });

  it("clears outdated highlights as soon as the text changes", async () => {
    const { user, field } = setup();
    await waitFor(() =>
      expect(field).toHaveAccessibleDescription(/ingredient: flour/),
    );

    await user.clear(field);
    await user.type(field, "salt");

    expect(field).not.toHaveAccessibleDescription(/ingredient: flour/);
    expect(field).toHaveTextContent("salt");
  });
});
