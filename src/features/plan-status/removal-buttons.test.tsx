import { PlanItemStatus } from "@/__generated__/graphql";
import {
  readStatus,
  seededCache,
  THANKSGIVING,
} from "@/features/plan-changes/test/status-cache";
import { render, screen, userEvent } from "@/test";
import { describe, expect, it, vi } from "vitest";
import { CookedItButton, DeleteButton } from "./removal-buttons";

// The pie (1), with the pumpkin (2) beneath it.
const PIE = "1";

describe("DeleteButton", () => {
  it("puts a delete on hold, offering to undo it in its place", async () => {
    const cache = seededCache();
    render(<DeleteButton itemId={PIE} planId={THANKSGIVING} />, { cache });

    await userEvent.click(
      screen.getByRole("button", { name: "Delete: Pumpkin pie" }),
    );

    expect(
      screen.getByRole("button", {
        name: "Wait, no! Undo delete: Pumpkin pie",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete: Pumpkin pie" }),
    ).not.toBeInTheDocument();
    expect(readStatus(cache, PIE)?.pendingStatus).toBe(PlanItemStatus.DELETED);
  });

  it("undoes a delete on hold", async () => {
    const cache = seededCache();
    render(<DeleteButton itemId={PIE} planId={THANKSGIVING} />, { cache });
    await userEvent.click(
      screen.getByRole("button", { name: "Delete: Pumpkin pie" }),
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: "Wait, no! Undo delete: Pumpkin pie",
      }),
    );

    expect(
      screen.getByRole("button", { name: "Delete: Pumpkin pie" }),
    ).toBeInTheDocument();
    expect(readStatus(cache, PIE)?.pendingStatus).toBeNull();
  });

  it("can't be used while an ancestor is going away", async () => {
    render(
      <>
        <DeleteButton itemId={PIE} planId={THANKSGIVING} />
        <DeleteButton itemId="2" planId={THANKSGIVING} />
      </>,
      { cache: seededCache() },
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Delete: Pumpkin pie" }),
    );

    expect(
      screen.getByRole("button", { name: "Delete: Pumpkin" }),
    ).toBeDisabled();
  });
});

describe("CookedItButton", () => {
  it("puts a completion on hold, and says it's cooked", async () => {
    const cache = seededCache();
    const onCooked = vi.fn();
    render(
      <CookedItButton itemId={PIE} planId={THANKSGIVING} onCooked={onCooked} />,
      { cache },
    );

    await userEvent.click(
      screen.getByRole("button", { name: "I cooked it: Pumpkin pie" }),
    );

    expect(readStatus(cache, PIE)?.pendingStatus).toBe(
      PlanItemStatus.COMPLETED,
    );
    expect(onCooked).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", {
        name: "Wait, no! Undo cooked: Pumpkin pie",
      }),
    ).toBeInTheDocument();
  });
});
