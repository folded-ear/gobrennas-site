import { PlanItemStatus } from "@/__generated__/graphql";
import { fakeApi } from "@/features/page-engine/test/fake-api";
import {
  readStatus,
  seededCache,
  THANKSGIVING,
} from "@/features/page-engine/test/status-cache";
import { act, render, screen, userEvent, waitFor } from "@/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CookedItButton, DeleteButton } from "./removal-buttons";

// The pie (1), with the pumpkin (2) beneath it.
const PIE = "1";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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
  it.each([
    { label: "Mon, Oct 5", date: new Date(2026, 9, 5, 20) },
    { label: "Tue, Sep 29", date: new Date(2026, 8, 29, 20) },
  ])(
    "saves $label as the cooking date when hiding the page",
    async ({ label, date }) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 9, 5, 20));
      const user = userEvent.setup();
      const cache = seededCache();
      const api = fakeApi(cache);
      const onCooked = vi.fn();
      render(
        <CookedItButton
          itemId={PIE}
          planId={THANKSGIVING}
          onCooked={onCooked}
        />,
        { client: api.client },
      );

      await user.click(
        screen.getByRole("button", {
          name: "Choose cooking date: Pumpkin pie",
        }),
      );
      expect(
        screen.getAllByRole("menuitem").map((item) => item.textContent),
      ).toEqual([
        "Mon, Oct 5",
        "Sun, Oct 4",
        "Sat, Oct 3",
        "Fri, Oct 2",
        "Thu, Oct 1",
        "Wed, Sep 30",
        "Tue, Sep 29",
      ]);
      await user.click(screen.getByRole("menuitem", { name: label }));

      expect(onCooked).toHaveBeenCalledOnce();
      expect(
        screen.getByRole("button", {
          name: "Wait, no! Undo cooked: Pumpkin pie",
        }),
      ).toBeInTheDocument();
      expect(api.requests).toHaveLength(0);
      await act(async () => {
        vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(api.requests[0]?.variables).toEqual({
        id0: PIE,
        status0: PlanItemStatus.COMPLETED,
        doneAt0: date.toISOString(),
      });
    },
  );

  it("records the main button's click time even when the save happens tomorrow", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const clickedAt = new Date(2026, 9, 5, 23, 59, 59);
    vi.setSystemTime(clickedAt);
    const user = userEvent.setup();
    const api = fakeApi(seededCache());
    render(<CookedItButton itemId={PIE} planId={THANKSGIVING} />, {
      client: api.client,
    });

    await user.click(
      screen.getByRole("button", { name: "I cooked it: Pumpkin pie" }),
    );
    vi.setSystemTime(new Date(2026, 9, 6, 0, 0, 1));
    await act(async () => {
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(api.requests[0]?.variables.doneAt0).toBe(clickedAt.toISOString());
  });

  it("refreshes the dates after midnight and lets a dated completion be undone", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 5, 23, 59));
    const cache = seededCache();
    render(<CookedItButton itemId={PIE} planId={THANKSGIVING} />, { cache });
    const trigger = screen.getByRole("button", {
      name: "Choose cooking date: Pumpkin pie",
    });
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(readStatus(cache, PIE)?.pendingStatus).toBeNull();
    vi.setSystemTime(new Date(2026, 9, 6, 0, 1));

    await userEvent.keyboard("{Enter}");
    expect(
      screen.getByRole("menuitem", { name: "Tue, Oct 6" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Tue, Sep 29" }),
    ).not.toBeInTheDocument();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await userEvent.click(
      screen.getByRole("button", {
        name: "Wait, no! Undo cooked: Pumpkin pie",
      }),
    );

    expect(readStatus(cache, PIE)?.pendingStatus).toBeNull();
    expect(
      screen.getByRole("button", { name: "Choose cooking date: Pumpkin pie" }),
    ).toBeEnabled();
  });

  it("disables both controls while an ancestor is being removed", async () => {
    render(
      <>
        <DeleteButton itemId={PIE} planId={THANKSGIVING} />
        <CookedItButton itemId="2" planId={THANKSGIVING} />
      </>,
      { cache: seededCache() },
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Delete: Pumpkin pie" }),
    );

    expect(
      screen.getByRole("button", { name: "I cooked it: Pumpkin" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Choose cooking date: Pumpkin" }),
    ).toBeDisabled();
  });

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
