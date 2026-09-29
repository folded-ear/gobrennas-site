import { describe, expect, it } from "vitest";
import { createChoiceHistory, moveChoice } from "./choice-history";
import type { MorselChoice } from "./types";

const choice: MorselChoice = {
  food: { id: "recipe", name: "chicken stock", kind: "Recipe" },
  range: { start: 7, end: 20 },
};
const selected = "2 cups chicken stock";

describe("explicit ingredient identity", () => {
  it("keeps the selected recipe through quantity and preparation changes, but releases edits to its name", () => {
    const shifted = moveChoice(selected, "12 cups chicken stock", choice);
    expect(shifted).toEqual({ ...choice, range: { start: 8, end: 21 } });
    expect(moveChoice(selected, selected + ", reduced", choice)).toEqual(
      choice,
    );
    expect(moveChoice(selected, selected + "s", choice)).toBeUndefined();
    expect(moveChoice(selected, "2 cups beef stock", choice)).toBeUndefined();
  });

  it("restores the exact chosen identity through native undo and redo, including grouped text edits", () => {
    const history = createChoiceHistory({ raw: "2 cups chicken st" });
    history.choose(selected, choice);
    history.edit(selected + ", ");
    history.edit(selected + ", reduced");
    expect(history.edit(selected, "historyUndo")).toEqual(choice);
    expect(history.edit("2 cups chicken st", "historyUndo")).toBeUndefined();
    expect(history.edit(selected, "historyRedo")).toEqual(choice);
    expect(history.edit(selected + ", reduced", "historyRedo")).toEqual(choice);
  });

  it("does not resurrect a choice when its name is manually replaced or retyped", () => {
    const history = createChoiceHistory({ raw: "2 cups chicken st" });
    history.choose(selected, choice);
    history.edit("2 cups flour");
    expect(history.edit(selected)).toBeUndefined();
  });

  it("tracks same-text choices independently and discards history after an external row replacement", () => {
    const history = createChoiceHistory({ raw: selected });
    history.choose(selected, choice);
    const section: MorselChoice = {
      ...choice,
      food: { ...choice.food, id: "section", kind: "Section" },
    };
    history.choose(selected, section);
    expect(history.edit(selected, "historyUndo")).toEqual(choice);
    expect(history.edit(selected, "historyRedo")).toEqual(section);
    history.sync({ raw: "flour" });
    expect(history.edit(selected, "historyUndo")).toBeUndefined();
  });
});
