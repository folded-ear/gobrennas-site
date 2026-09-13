import { render, screen, userEvent, within } from "@/test";
import { describe, expect, it, vi } from "vitest";
import { PlanPicker } from "./index";

const WEEKNIGHTS = {
  __typename: "Plan" as const,
  id: "1",
  name: "Weeknights",
  color: "#f5cd06",
  mine: true,
};
const NEIGHBOR = {
  __typename: "Plan" as const,
  id: "3",
  name: "Neighbor Plan",
  color: "#9cb7da",
  mine: false,
};
const FEAST_DAY = {
  __typename: "Plan" as const,
  id: "2",
  name: "Feast Day",
  color: "#89ac66",
  mine: true,
};
const PLANS = [WEEKNIGHTS, NEIGHBOR, FEAST_DAY];

async function openPicker() {
  await userEvent.click(screen.getByRole("button", { name: /Plans/ }));
  return screen.getByRole("listbox");
}

describe("PlanPicker", () => {
  it("shows nothing when there's only one plan to pick", () => {
    render(
      <PlanPicker
        label="Plans"
        plans={[WEEKNIGHTS]}
        selectionMode="multiple"
        selectedIds={[WEEKNIGHTS.id]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the selected plans' avatars on its trigger", () => {
    render(
      <PlanPicker
        label="Plans"
        plans={PLANS}
        selectionMode="multiple"
        selectedIds={[FEAST_DAY.id, NEIGHBOR.id]}
        onChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: /Plans/ });
    expect(within(trigger).getByTitle(FEAST_DAY.name)).toBeVisible();
    expect(within(trigger).getByTitle(NEIGHBOR.name)).toBeVisible();
    expect(within(trigger).queryByTitle(WEEKNIGHTS.name)).toBeNull();
  });

  it("keeps owned and shared plans apart on its trigger", () => {
    render(
      <PlanPicker
        label="Plans"
        plans={PLANS}
        selectionMode="multiple"
        selectedIds={[NEIGHBOR.id, FEAST_DAY.id, WEEKNIGHTS.id]}
        onChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: /Plans/ });
    const [mine, shared] = within(trigger).getAllByRole("group");
    expect(
      within(mine)
        .getAllByTitle(/./)
        .map((it) => it.title),
    ).toEqual([WEEKNIGHTS.name, FEAST_DAY.name]);
    expect(
      within(shared)
        .getAllByTitle(/./)
        .map((it) => it.title),
    ).toEqual([NEIGHBOR.name]);
  });

  it("offers owned and shared plans in separate groups", async () => {
    render(
      <PlanPicker
        label="Plans"
        plans={PLANS}
        selectionMode="multiple"
        selectedIds={[WEEKNIGHTS.id]}
        onChange={vi.fn()}
      />,
    );

    const listbox = await openPicker();

    const mine = within(listbox).getByRole("group", { name: "My Plans" });
    const shared = within(listbox).getByRole("group", {
      name: "Shared Plans",
    });
    expect(within(mine).getAllByRole("option")).toHaveLength(2);
    expect(
      within(mine).getByRole("option", { name: WEEKNIGHTS.name }),
    ).toBeVisible();
    expect(
      within(mine).getByRole("option", { name: FEAST_DAY.name }),
    ).toBeVisible();
    expect(within(shared).getAllByRole("option")).toHaveLength(1);
    expect(
      within(shared).getByRole("option", { name: NEIGHBOR.name }),
    ).toBeVisible();
  });

  it("marks which plans are selected", async () => {
    render(
      <PlanPicker
        label="Plans"
        plans={PLANS}
        selectionMode="multiple"
        selectedIds={[FEAST_DAY.id, NEIGHBOR.id]}
        onChange={vi.fn()}
      />,
    );

    const listbox = await openPicker();

    const option = (name: string) =>
      within(listbox).getByRole("option", { name });
    expect(option(FEAST_DAY.name)).toHaveAttribute("aria-selected", "true");
    expect(option(NEIGHBOR.name)).toHaveAttribute("aria-selected", "true");
    expect(option(WEEKNIGHTS.name)).toHaveAttribute("aria-selected", "false");
  });

  it("adds a plan to a multiple selection", async () => {
    const onChange = vi.fn();
    render(
      <PlanPicker
        label="Plans"
        plans={PLANS}
        selectionMode="multiple"
        selectedIds={[WEEKNIGHTS.id]}
        onChange={onChange}
      />,
    );

    const listbox = await openPicker();
    await userEvent.click(
      within(listbox).getByRole("option", { name: NEIGHBOR.name }),
    );

    expect(onChange).toHaveBeenLastCalledWith([WEEKNIGHTS.id, NEIGHBOR.id]);
  });

  it("replaces a single selection", async () => {
    const onChange = vi.fn();
    render(
      <PlanPicker
        label="Plans"
        plans={PLANS}
        selectionMode="single"
        selectedIds={[WEEKNIGHTS.id]}
        onChange={onChange}
      />,
    );

    const listbox = await openPicker();
    await userEvent.click(
      within(listbox).getByRole("option", { name: FEAST_DAY.name }),
    );

    expect(onChange).toHaveBeenLastCalledWith([FEAST_DAY.id]);
  });
});
