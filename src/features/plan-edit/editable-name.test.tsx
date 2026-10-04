import { PlanItemStatus } from "@/__generated__/graphql";
import { THANKSGIVING } from "@/features/plan-sync/test/status-cache";
import { screen, userEvent, waitFor } from "@/test";
import { describe, expect, it } from "vitest";
import { renderEditHost } from "./test/edit-host";

function nameButton(name: string) {
  return screen.getByRole("button", { name });
}

function editor(name: string | RegExp = /./) {
  return screen.getByRole("textbox", { name });
}

async function edit(name: string) {
  await userEvent.click(nameButton(name));
  return editor();
}

async function leave() {
  await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }));
}

describe("EditableName", () => {
  it("starts editing on a press anywhere in its text area", async () => {
    renderEditHost();

    await userEvent.click(nameButton("Whipped cream").parentElement!);

    expect(editor()).toHaveValue("Whipped cream");
    expect(editor()).toHaveFocus();
  });

  it("starts editing from the keyboard, on its name", async () => {
    renderEditHost();
    nameButton("Whipped cream").focus();

    await userEvent.keyboard("{Enter}");

    expect(editor()).toHaveValue("Whipped cream");
  });

  it("offers nothing to edit to a viewer who can't change the plan", async () => {
    renderEditHost({ canEdit: false });

    expect(screen.queryByRole("button", { name: "Whipped cream" })).toBeNull();
    await userEvent.click(screen.getByText("Whipped cream"));
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("saves a new name once focus leaves, and shows the name again", async () => {
    const { requests } = renderEditHost();
    const field = await edit("Whipped cream");

    await userEvent.clear(field);
    await userEvent.type(field, "Ice cream");
    await leave();

    await waitFor(() =>
      expect(requests.map((it) => it.variables)).toEqual([
        { id0: "3", name0: "Ice cream" },
      ]),
    );
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("saves nothing for a name left as it was", async () => {
    const { requests } = renderEditHost();
    await edit("Whipped cream");

    await leave();

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(requests).toEqual([]);
  });

  it("cancels on Escape, saving nothing and keeping focus on the name", async () => {
    const { requests } = renderEditHost();
    const field = await edit("Whipped cream");
    await userEvent.type(field, " and more");

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(nameButton("Whipped cream")).toHaveFocus();
    expect(requests).toEqual([]);
  });

  it("adds a new item below on Enter, then creates it once focus leaves", async () => {
    const { requests } = renderEditHost();
    await edit("Whipped cream");

    await userEvent.keyboard("{Enter}");
    expect(editor("New item")).toHaveFocus();
    await userEvent.keyboard("Stuffing");
    await leave();

    await waitFor(() =>
      expect(requests.map((it) => it.variables)).toEqual([
        { parentId0: THANKSGIVING, afterId0: "3", name0: "Stuffing" },
      ]),
    );
  });

  it("adds a new item above on Enter with the caret at the start", async () => {
    const { requests } = renderEditHost();
    const field = await edit("Whipped cream");
    (field as HTMLInputElement).setSelectionRange(0, 0);

    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("Stuffing");
    await leave();

    await waitFor(() =>
      expect(requests.map((it) => it.variables)).toEqual([
        { parentId0: THANKSGIVING, afterId0: "1", name0: "Stuffing" },
      ]),
    );
    const rows = screen.getAllByRole("listitem").map((it) => it.textContent);
    expect(rows.indexOf("Stuffing")).toBeLessThan(
      rows.findIndex((it) => it?.startsWith("Whipped cream")),
    );
  });

  it("throws away a new item left blank", async () => {
    const { requests } = renderEditHost();
    await edit("Whipped cream");
    await userEvent.keyboard("{Enter}");

    await leave();

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(requests).toEqual([]);
  });

  it("does nothing on Enter in a blank item", async () => {
    renderEditHost();
    const field = await edit("Whipped cream");
    await userEvent.clear(field);

    await userEvent.keyboard("{Enter}");

    expect(editor()).toBe(field);
  });

  it("deletes an emptied item on Backspace, editing the one before", async () => {
    const { requests } = renderEditHost();
    const field = await edit("Whipped cream");
    await userEvent.clear(field);

    await userEvent.keyboard("{Backspace}");

    await waitFor(() =>
      expect(requests.map((it) => it.variables)).toEqual([
        { id0: "3", status0: PlanItemStatus.DELETED },
      ]),
    );
    expect(editor()).toHaveValue("Pumpkin");
    expect(editor()).toHaveFocus();
  });

  it("deletes an emptied item on Delete, editing the one after", async () => {
    renderEditHost();
    const field = await edit("Pumpkin");
    await userEvent.clear(field);

    await userEvent.keyboard("{Delete}");

    expect(editor()).toHaveValue("Whipped cream");
  });

  it("leaves an emptied item with something below it on Backspace", async () => {
    const { requests } = renderEditHost();
    const field = await edit("Pumpkin pie");
    await userEvent.clear(field);

    await userEvent.keyboard("{Backspace}");

    expect(editor()).toBe(field);
    expect(requests).toEqual([]);
  });

  it("deletes an item left blank once focus leaves, if nothing is below it", async () => {
    const { requests } = renderEditHost();
    const field = await edit("Whipped cream");
    await userEvent.clear(field);

    await leave();

    await waitFor(() =>
      expect(requests.map((it) => it.variables)).toEqual([
        { id0: "3", status0: PlanItemStatus.DELETED },
      ]),
    );
  });

  it("saves a blank name for an item with something below it", async () => {
    const { requests } = renderEditHost();
    const field = await edit("Pumpkin pie");
    await userEvent.clear(field);

    await leave();

    await waitFor(() =>
      expect(requests.map((it) => it.variables)).toEqual([
        { id0: "1", name0: "" },
      ]),
    );
  });
});
