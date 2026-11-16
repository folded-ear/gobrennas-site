import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
  waitForElementToBeRemoved,
} from "@/test";
import type { MockLink } from "@apollo/client/testing";
import { describe, expect, it } from "vitest";
import { CookNotesFragmentDoc } from "./__generated__/cookNotes.generated";
import { SetCookNotesDocument } from "./__generated__/setCookNotes.generated";
import { CookNotes } from "./notes";
import { LENTIL_SOUP, notesSaved } from "./test/history";

const COOK = "8777749733301";
const NOTES = "Doubled the cumin.\nNeeded more lemon.";

function show(
  notes: string | null,
  editable: boolean,
  mocks: readonly MockLink.MockedResponse[] = [],
) {
  const cache = buildInMemoryCache();
  const record = seedFragment(cache, CookNotesFragmentDoc, "cookNotes", {
    __typename: "PlannedRecipeHistory",
    id: COOK,
    notes,
  });
  render(
    <CookNotes record={record} recipeId={LENTIL_SOUP} editable={editable} />,
    { cache, mocks },
  );
}

/** I find the notes with their line breaks intact. */
const asWritten = () => screen.getByText(NOTES, { normalizer: (text) => text });
const edit = () => screen.getByRole("button", { name: "Edit notes" });
const editor = () => screen.getByRole("textbox", { name: "Notes" });

describe("CookNotes", () => {
  it("shows the notes as written, line breaks and all", () => {
    show(NOTES, false);
    expect(asWritten()).toBeVisible();
  });

  it("offers no editing of someone else's notes", () => {
    show(NOTES, false);
    expect(
      screen.queryByRole("button", { name: "Edit notes" }),
    ).not.toBeInTheDocument();
  });

  it("saves its owner's edited notes, then returns to them", async () => {
    show(NOTES, true, [notesSaved(COOK, "Perfect as written.")]);

    await userEvent.click(edit());
    expect(editor()).toHaveFocus();
    expect(editor()).toHaveValue(NOTES);
    await userEvent.clear(editor());
    await userEvent.type(editor(), "Perfect as written.");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitForElementToBeRemoved(() => screen.queryByRole("textbox"));
    expect(screen.getByText("Perfect as written.")).toBeVisible();
    expect(edit()).toHaveFocus();
  });

  it("drops the draft when cancelled", async () => {
    show(NOTES, true);

    await userEvent.click(edit());
    await userEvent.type(editor(), " And bread.");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(asWritten()).toBeVisible();
    expect(edit()).toHaveFocus();
  });

  it("keeps the draft and says so when saving fails, then saves on retry", async () => {
    show(null, true, [
      {
        request: {
          query: SetCookNotesDocument,
          variables: { recipeId: LENTIL_SOUP, id: COOK, notes: "Too salty." },
        },
        error: new Error("Connection failed"),
      },
      notesSaved(COOK, "Too salty."),
    ]);

    await userEvent.click(edit());
    await userEvent.type(editor(), "Too salty.");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Couldn’t save the notes")).toBeVisible();
    expect(editor()).toHaveValue("Too salty.");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitForElementToBeRemoved(() => screen.queryByRole("textbox"));
    expect(screen.getByText("Too salty.")).toBeVisible();
  });
});
