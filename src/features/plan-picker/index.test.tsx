import { VIEW_ONLY_HINT } from "@/components/plan-option";
import { render, screen, userEvent, within } from "@/test";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { LAST_PLAN_HINT, PlanPicker } from "./index";

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
const MANY = [
  WEEKNIGHTS,
  FEAST_DAY,
  { ...WEEKNIGHTS, id: "4", name: "Meal Prep", color: "#c2255c" },
  { ...WEEKNIGHTS, id: "5", name: "Camping Trip", color: "#0b7285" },
];

async function openPicker() {
  await userEvent.click(screen.getByRole("button", { name: /Plans$/ }));
  return screen.getByRole("listbox");
}

/** I hold a multiple selection of PLANS, as a screen would. */
function StatefulPicker({ selectedIds }: { selectedIds: string[] }) {
  const [ids, setIds] = useState(selectedIds);
  return (
    <PlanPicker
      label="Plans"
      plans={PLANS}
      selectionMode="multiple"
      selectedIds={ids}
      onChange={setIds}
    />
  );
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

  it("shows the selected plans' avatars in its field", () => {
    render(
      <PlanPicker
        label="Plans"
        plans={PLANS}
        selectionMode="multiple"
        selectedIds={[FEAST_DAY.id, NEIGHBOR.id]}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: FEAST_DAY.name, pressed: true }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: NEIGHBOR.name, pressed: true }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: WEEKNIGHTS.name })).toBeNull();
  });

  it("keeps owned and shared plans apart in its field", () => {
    render(
      <PlanPicker
        label="Plans"
        plans={PLANS}
        selectionMode="multiple"
        selectedIds={[NEIGHBOR.id, FEAST_DAY.id, WEEKNIGHTS.id]}
        onChange={vi.fn()}
      />,
    );

    const names = (group: string) =>
      within(screen.getByRole("group", { name: group }))
        .getAllByRole("button")
        .map((it) => it.getAttribute("aria-label"));
    expect(names("My Plans")).toEqual([WEEKNIGHTS.name, FEAST_DAY.name]);
    expect(names("Shared Plans")).toEqual([NEIGHBOR.name]);
  });

  it("toggles a plan from its avatar, keeping it to select again", async () => {
    render(<StatefulPicker selectedIds={[WEEKNIGHTS.id, FEAST_DAY.id]} />);

    await userEvent.click(screen.getByRole("button", { name: FEAST_DAY.name }));
    expect(
      screen.getByRole("button", { name: FEAST_DAY.name, pressed: false }),
    ).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: FEAST_DAY.name }));
    expect(
      screen.getByRole("button", { name: FEAST_DAY.name, pressed: true }),
    ).toBeVisible();
  });

  it("keeps a plan unselected from the list to select again", async () => {
    render(<StatefulPicker selectedIds={[WEEKNIGHTS.id, FEAST_DAY.id]} />);

    const listbox = await openPicker();
    await userEvent.click(
      within(listbox).getByRole("option", { name: FEAST_DAY.name }),
    );
    await userEvent.keyboard("{Escape}");

    expect(
      screen.getByRole("button", { name: FEAST_DAY.name, pressed: false }),
    ).toBeVisible();
  });

  it("won't unselect the last selected plan from its avatar", () => {
    render(<StatefulPicker selectedIds={[WEEKNIGHTS.id]} />);

    const weeknights = screen.getByRole("button", { name: WEEKNIGHTS.name });
    expect(weeknights).toBeDisabled();
    expect(weeknights).toHaveAccessibleDescription(LAST_PLAN_HINT);
    expect(screen.getByTitle(LAST_PLAN_HINT)).toContainElement(weeknights);
  });

  it("stacks selected plans past three", () => {
    render(
      <PlanPicker
        label="Plans"
        plans={MANY}
        selectionMode="multiple"
        selectedIds={MANY.map((it) => it.id)}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("img", { name: MANY.map((it) => it.name).join(", ") }),
    ).toBeVisible();
    for (const plan of MANY)
      expect(screen.queryByRole("button", { name: plan.name })).toBeNull();
  });

  it("toggles a plan from its avatar without opening the list", async () => {
    render(<StatefulPicker selectedIds={[WEEKNIGHTS.id, FEAST_DAY.id]} />);

    await userEvent.click(screen.getByRole("button", { name: FEAST_DAY.name }));

    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("names the selected plan only while it's the only avatar", async () => {
    render(<StatefulPicker selectedIds={[WEEKNIGHTS.id]} />);

    // the box also holds a hidden native select listing every plan
    const name = () =>
      within(screen.getByRole("group", { name: "Plans" })).queryByText(
        WEEKNIGHTS.name,
        { ignore: "option" },
      );
    expect(name()).toBeVisible();

    const listbox = await openPicker();
    await userEvent.click(
      within(listbox).getByRole("option", { name: FEAST_DAY.name }),
    );
    await userEvent.keyboard("{Escape}");

    expect(name()).toBeNull();
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

  it("fills the avatars of selected plans and rings the rest", async () => {
    render(
      <PlanPicker
        label="Plans"
        plans={PLANS}
        selectionMode="multiple"
        selectedIds={[FEAST_DAY.id]}
        onChange={vi.fn()}
      />,
    );

    const listbox = await openPicker();

    const avatar = (name: string) =>
      within(within(listbox).getByRole("option", { name })).getByTitle(name);
    expect(avatar(FEAST_DAY.name)).not.toHaveAttribute("data-unselected");
    expect(avatar(WEEKNIGHTS.name)).toHaveAttribute("data-unselected");
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

  it("lists disabled plans without letting them be picked", async () => {
    const onChange = vi.fn();
    render(
      <PlanPicker
        label="Plans"
        plans={PLANS}
        selectionMode="single"
        selectedIds={[WEEKNIGHTS.id]}
        onChange={onChange}
        disabledIds={[NEIGHBOR.id]}
      />,
    );

    const listbox = await openPicker();

    const neighbor = within(listbox).getByRole("option", {
      name: NEIGHBOR.name,
    });
    expect(neighbor).toHaveAttribute("aria-disabled", "true");
    expect(neighbor).toHaveAccessibleDescription(VIEW_ONLY_HINT);
    expect(
      within(listbox).getByRole("option", { name: FEAST_DAY.name }),
    ).not.toHaveAttribute("aria-disabled");

    await userEvent.click(neighbor);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("lets every plan be picked unless told otherwise", async () => {
    render(
      <PlanPicker
        label="Plans"
        plans={PLANS}
        selectionMode="single"
        selectedIds={[WEEKNIGHTS.id]}
        onChange={vi.fn()}
      />,
    );

    const listbox = await openPicker();

    for (const option of within(listbox).getAllByRole("option")) {
      expect(option).not.toHaveAttribute("aria-disabled");
      expect(option).not.toHaveAccessibleDescription(VIEW_ONLY_HINT);
    }
  });
});
