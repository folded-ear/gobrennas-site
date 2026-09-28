import { PlanItemStatus } from "@/__generated__/graphql";
import { PlanItemChangeStateFragmentDoc } from "@/features/plan-changes/__generated__/planItemChangeState.generated";
import {
  readStatus,
  seededCache,
  THANKSGIVING,
} from "@/features/plan-changes/test/status-cache";
import { savedStatuses } from "@/features/plan-changes/test/status-mocks";
import { render, screen, userEvent } from "@/test";
import { describe, expect, it } from "vitest";
import { TOGGLE_LOOKS } from "./status";
import { StatusButton } from "./status-button";

// Whipped cream (3), and the pumpkin (2) beneath the pie (1).
const CREAM = "3";

describe("StatusButton", () => {
  it("marks a needed item acquired, saving it at once", async () => {
    const cache = seededCache();
    render(<StatusButton itemId={CREAM} planId={THANKSGIVING} canChange />, {
      cache,
      mocks: [savedStatuses([{ id: CREAM, status: PlanItemStatus.ACQUIRED }])],
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Mark acquired: Whipped cream" }),
    );

    expect(
      await screen.findByRole("button", { name: "Mark needed: Whipped cream" }),
    ).toBeInTheDocument();
    expect(readStatus(cache, CREAM)?.status).toBe(PlanItemStatus.ACQUIRED);
  });

  it("shows it is saving until the server answers", async () => {
    render(<StatusButton itemId={CREAM} planId={THANKSGIVING} canChange />, {
      cache: seededCache(),
      mocks: [
        savedStatuses([{ id: CREAM, status: PlanItemStatus.ACQUIRED }], {
          delay: Infinity,
        }),
      ],
    });
    const button = screen.getByRole("button", {
      name: "Mark acquired: Whipped cream",
    });

    await userEvent.click(button);

    expect(button).toHaveAttribute("data-pending", "true");
  });

  it("only shows the status to a viewer who can't change it", () => {
    render(
      <StatusButton itemId={CREAM} planId={THANKSGIVING} canChange={false} />,
      { cache: seededCache() },
    );

    expect(screen.getByRole("img", { name: "Needed" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps its own status, in the color of the one it counts as", () => {
    render(
      <StatusButton
        itemId={CREAM}
        planId={THANKSGIVING}
        canChange
        countsAs={PlanItemStatus.ACQUIRED}
      />,
      { cache: seededCache() },
    );

    expect(
      screen.getByRole("button", {
        name: "Mark acquired: Whipped cream (counts as acquired)",
      }),
    ).toHaveClass(TOGGLE_LOOKS[PlanItemStatus.ACQUIRED].className);
  });

  it("names the status it counts as to a viewer who can't change it", () => {
    render(
      <StatusButton
        itemId={CREAM}
        planId={THANKSGIVING}
        canChange={false}
        countsAs={PlanItemStatus.ACQUIRED}
      />,
      { cache: seededCache() },
    );

    expect(
      screen.getByRole("img", { name: "Needed (counts as acquired)" }),
    ).toHaveClass(TOGGLE_LOOKS[PlanItemStatus.ACQUIRED].className);
  });

  it("can't be used while an ancestor is going away", () => {
    const cache = seededCache();
    cache.writeFragment({
      fragment: PlanItemChangeStateFragmentDoc,
      id: "PlanItem:1",
      data: {
        __typename: "PlanItem",
        pendingStatus: PlanItemStatus.DELETED,
        savingStatus: false,
        pendingName: null,
      },
    });

    render(<StatusButton itemId="2" planId={THANKSGIVING} canChange />, {
      cache,
    });

    expect(
      screen.getByRole("button", { name: "Mark acquired: Pumpkin" }),
    ).toBeDisabled();
  });
});
