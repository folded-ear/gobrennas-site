import { AccessLevel } from "@/__generated__/graphql";
import {
  act,
  buildInMemoryCache,
  render,
  screen,
  userEvent,
  within,
} from "@/test";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PlannerPlanBarFragmentDoc,
  type PlannerPlanBarFragment,
} from "./__generated__/management.generated";
import { PlannerPlanBar } from "./plan-bar";

const mine: PlannerPlanBarFragment = {
  __typename: "Plan",
  id: "weeknights",
  name: "Weeknight meals",
  color: "#325578",
  mine: true,
  ownedBy: null,
  grants: [],
};
const second: PlannerPlanBarFragment = {
  ...mine,
  id: "weekend",
  name: "Weekend",
};
const shared: PlannerPlanBarFragment = {
  ...mine,
  id: "family",
  mine: false,
  name: "Family dinners",
  ownedBy: { __typename: "User", id: "brenna", name: "Brenna" },
  grants: [
    {
      __typename: "AccessControlEntry",
      level: AccessLevel.VIEW,
      user: { __typename: "User", id: "me", me: true },
    },
  ],
};

function Harness({
  plans,
  onManage,
  onCreate,
}: {
  plans: readonly PlannerPlanBarFragment[];
  onManage: (id: string) => void;
  onCreate: () => void;
}) {
  const [selected, setSelected] = useState([mine.id]);
  return (
    <PlannerPlanBar
      plans={plans}
      selectedIds={selected}
      onChange={setSelected}
      onManage={onManage}
      onCreate={onCreate}
      renderOwnerAvatar={() => <span title="Brenna">B</span>}
    />
  );
}

function mount(plans = [shared, mine, second]) {
  const cache = buildInMemoryCache();
  for (const plan of plans)
    cache.writeFragment({ fragment: PlannerPlanBarFragmentDoc, data: plan });
  const onManage = vi.fn();
  const onCreate = vi.fn();
  render(<Harness plans={plans} onManage={onManage} onCreate={onCreate} />, {
    cache,
  });
  return { onManage, onCreate };
}

afterEach(() => vi.restoreAllMocks());

describe("PlannerPlanBar", () => {
  it("should show owned plans first, identify shared owners, and keep selection stable", async () => {
    const user = userEvent.setup();
    mount();
    const toggles = screen.getAllByRole("button", { pressed: false });
    expect(toggles.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Weekend",
      "Family dinners · Brenna",
    ]);
    expect(screen.getAllByText("Your plans")[0]).toBeVisible();
    expect(screen.getAllByText("Shared with you")[0]).toBeVisible();
    const sharedToggle = screen.getByRole("button", {
      name: "Family dinners · Brenna",
    });
    expect(within(sharedToggle).getByTitle("Brenna")).toBeVisible();
    expect(sharedToggle).not.toHaveTextContent("Brenna");
    const first = screen.getByRole("button", { name: mine.name });
    await user.click(first);
    expect(first).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: second.name }));
    expect(first).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: second.name })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(first);
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByRole("button", { pressed: false })[0]).toBe(first);
  });

  it("should keep settings separate from selection and hide them for read-only plans", async () => {
    const user = userEvent.setup();
    const { onManage } = mount();
    expect(
      screen.queryByRole("button", { name: /Options for Family/ }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: `Options for ${second.name}` }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Plan settings" }));
    expect(onManage).toHaveBeenCalledWith(second.id);
    expect(screen.getByRole("button", { name: second.name })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("should offer creation even when there are no plans", async () => {
    const user = userEvent.setup();
    const { onCreate } = mount([]);
    await user.click(screen.getByRole("button", { name: "New plan" }));
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it("should put remaining plans in grouped overflow and recalculate when space grows", async () => {
    const user = userEvent.setup();
    let width = 360;
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
      () => width,
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () => DOMRect.fromRect({ width: 180, height: 40 }),
    );
    const original = global.ResizeObserver;
    const resizeCallbacks: (() => void)[] = [];
    global.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallbacks.push(() => callback([], this));
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    try {
      const { onManage } = mount();
      expect(screen.getByRole("button", { name: mine.name })).toBeVisible();
      expect(
        screen.queryByRole("button", { name: second.name }),
      ).not.toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: "More plans · 0 selected" }),
      );
      const overflow = screen.getByRole("dialog", { name: "More plans" });
      const sharedToggle = within(overflow).getByRole("button", {
        name: "Family dinners · Brenna",
      });
      expect(within(sharedToggle).getByTitle("Brenna")).toBeVisible();
      expect(sharedToggle).not.toHaveTextContent("Brenna");
      expect(
        within(overflow).getByRole("region", { name: "Your plans" }),
      ).toBeVisible();
      expect(
        within(overflow).getByRole("region", { name: "Shared with you" }),
      ).toBeVisible();
      await user.click(
        within(overflow).getByRole("button", { name: second.name }),
      );
      expect(
        within(overflow).getByRole("button", { name: second.name }),
      ).toHaveAttribute("aria-pressed", "true");
      await user.click(
        within(overflow).getByRole("button", {
          name: `Options for ${second.name}`,
        }),
      );
      await user.click(screen.getByRole("menuitem", { name: "Plan settings" }));
      expect(onManage).toHaveBeenCalledWith(second.id);
      expect(
        screen.queryByRole("dialog", { name: "More plans" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "More plans · 1 selected" }),
      ).toBeVisible();
      act(() => {
        width = 800;
        for (const callback of resizeCallbacks) callback();
      });
      expect(screen.getByRole("button", { name: second.name })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(
        screen.queryByRole("button", { name: /More plans/ }),
      ).not.toBeInTheDocument();
    } finally {
      global.ResizeObserver = original;
    }
  });
});
