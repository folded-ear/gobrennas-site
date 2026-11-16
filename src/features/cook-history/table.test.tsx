import { PlanItemStatus } from "@/__generated__/graphql";
import { act, render, screen, userEvent, waitFor, within } from "@/test";
import type { MockLink } from "@apollo/client/testing";
import { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CookHistoryTable, HISTORY_PAGE_SIZE } from "./table";
import {
  BARNEY,
  BRENNA,
  cook,
  historyListed,
  LENTIL_SOUP,
} from "./test/history";

// a Sunday afternoon, local time
const NOW = new Date(2026, 10, 8, 15, 0);
const at = (...local: [number, number, number, number, number]) =>
  new Date(...local).toISOString();

const MINE = cook("8777749733301", BRENNA, at(2026, 10, 7, 18, 30), {
  ratingInt: 4,
  notes: "Doubled the cumin.",
});
const THEIRS = cook("8777749733302", BARNEY, at(2026, 9, 29, 19, 0), {
  ratingInt: 3,
  notes: "Too much cumin.",
});
const THEIRS_DELETED = cook("8777749733303", BARNEY, at(2026, 9, 20, 12, 0), {
  status: PlanItemStatus.DELETED,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

/** I render the table, awaiting its first load, which suspends. */
async function show(mocks: readonly MockLink.MockedResponse[]) {
  await act(async () => {
    render(
      <Suspense fallback={<p>Loading cooks</p>}>
        <CookHistoryTable recipeId={LENTIL_SOUP} />
      </Suspense>,
      { mocks },
    );
  });
}

/** I find the listed cooks' rows, by the row header each one has. */
async function cookRows() {
  const headers = await screen.findAllByRole("rowheader");
  return headers.map((it) => it.closest<HTMLElement>("[role=row]")!);
}

describe("CookHistoryTable", () => {
  it("lists each cook by whether it was cooked, and when", async () => {
    await show([
      historyListed(HISTORY_PAGE_SIZE, [MINE, THEIRS, THEIRS_DELETED]),
    ]);

    const [mine, theirs, deleted] = await cookRows();
    expect(within(mine).getByRole("img", { name: "Cooked" })).toBeVisible();
    expect(mine).toHaveTextContent("yesterday");
    expect(theirs).toHaveTextContent("Thu, Oct 29");
    expect(within(deleted).getByRole("img", { name: "Deleted" })).toBeVisible();
  });

  it("lets the viewer change only their own cooks", async () => {
    await show([
      historyListed(HISTORY_PAGE_SIZE, [MINE, THEIRS, THEIRS_DELETED]),
    ]);

    const [mine, theirs, deleted] = await cookRows();
    expect(within(mine).getByRole("radiogroup")).not.toHaveAttribute(
      "aria-readonly",
    );
    expect(
      within(mine).getByRole("button", { name: "Edit notes" }),
    ).toBeVisible();
    expect(within(theirs).getByRole("radiogroup")).toHaveAttribute(
      "aria-readonly",
      "true",
    );
    expect(
      within(theirs).queryByRole("button", { name: "Edit notes" }),
    ).not.toBeInTheDocument();
    expect(within(deleted).queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("offers more cooks while there are more, and lists them", async () => {
    const cooks = Array.from({ length: 12 }, (_, i) =>
      cook(
        `87777497334${String(i).padStart(2, "0")}`,
        BARNEY,
        at(2026, 8, 30 - i, 12, 0),
      ),
    );
    await show([
      historyListed(HISTORY_PAGE_SIZE, cooks),
      historyListed(2 * HISTORY_PAGE_SIZE, cooks),
    ]);

    expect(await cookRows()).toHaveLength(HISTORY_PAGE_SIZE);
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    await waitFor(() =>
      expect(screen.getAllByRole("rowheader")).toHaveLength(cooks.length),
    );
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the cooks listed and says so when loading more fails", async () => {
    const cooks = Array.from({ length: 12 }, (_, i) =>
      cook(
        `87777497334${String(i).padStart(2, "0")}`,
        BARNEY,
        at(2026, 8, 30 - i, 12, 0),
      ),
    );
    await show([
      historyListed(HISTORY_PAGE_SIZE, cooks),
      {
        ...historyListed(2 * HISTORY_PAGE_SIZE, cooks),
        result: undefined,
        error: new Error("Connection failed"),
      },
      historyListed(2 * HISTORY_PAGE_SIZE, cooks),
    ]);
    await cookRows();

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Couldn’t load more cooks")).toBeVisible();
    expect(screen.getAllByRole("rowheader")).toHaveLength(HISTORY_PAGE_SIZE);

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    await waitFor(() =>
      expect(screen.getAllByRole("rowheader")).toHaveLength(cooks.length),
    );
    expect(
      screen.queryByText("Couldn’t load more cooks"),
    ).not.toBeInTheDocument();
  });

  it("offers no more when every cook is listed", async () => {
    await show([historyListed(HISTORY_PAGE_SIZE, [MINE, THEIRS])]);

    expect(await cookRows()).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
  });
});
