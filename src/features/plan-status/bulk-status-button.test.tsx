import { PlanItemStatus } from "@/__generated__/graphql";
import {
  PICNIC,
  readStatus,
  seededCache,
  THANKSGIVING,
} from "@/features/page-engine/test/status-cache";
import { savedStatuses } from "@/features/page-engine/test/status-mocks";
import { render, screen, userEvent, waitFor } from "@/test";
import { describe, expect, it } from "vitest";
import { BulkStatusButton } from "./bulk-status-button";

// Whipped cream (3) at Thanksgiving, and salad (4) at the picnic.
const ITEMS = [
  { id: "3", planId: THANKSGIVING },
  { id: "4", planId: PICNIC },
];

describe("BulkStatusButton", () => {
  it("marks every item acquired, each plan in its own request", async () => {
    const cache = seededCache();
    render(
      <BulkStatusButton
        items={ITEMS}
        status={PlanItemStatus.NEEDED}
        name="Sugar"
        canChange
      />,
      {
        cache,
        mocks: [
          savedStatuses([{ id: "3", status: PlanItemStatus.ACQUIRED }]),
          savedStatuses([{ id: "4", status: PlanItemStatus.ACQUIRED }]),
        ],
      },
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Mark acquired: Sugar" }),
    );

    await waitFor(() =>
      expect(readStatus(cache, "4")?.status).toBe(PlanItemStatus.ACQUIRED),
    );
    expect(readStatus(cache, "3")?.status).toBe(PlanItemStatus.ACQUIRED);
  });

  it("marks acquired items needed again", async () => {
    render(
      <BulkStatusButton
        items={ITEMS}
        status={PlanItemStatus.ACQUIRED}
        name="Sugar"
        canChange
      />,
      { cache: seededCache() },
    );

    expect(
      screen.getByRole("button", { name: "Mark needed: Sugar" }),
    ).toBeInTheDocument();
  });

  it("only shows the status to a viewer who can't change it", () => {
    render(
      <BulkStatusButton
        items={ITEMS}
        status={PlanItemStatus.ACQUIRED}
        name="Sugar"
        canChange={false}
      />,
      { cache: seededCache() },
    );

    expect(screen.getByRole("img", { name: "Acquired" })).toBeInTheDocument();
  });
});
