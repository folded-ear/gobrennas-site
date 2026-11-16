import {
  act,
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
} from "@/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CookHistorySummaryFragmentDoc } from "./__generated__/cookHistorySummary.generated";
import { CookHistory } from "./index";
import { HISTORY_PAGE_SIZE } from "./table";
import { BRENNA, cook, historyListed, LENTIL_SOUP } from "./test/history";

// a Sunday afternoon, local time
const NOW = new Date(2026, 10, 8, 15, 0);
const YESTERDAY = new Date(2026, 10, 7, 18, 30).toISOString();
const LAST = cook("8777749733301", BRENNA, YESTERDAY, { ratingInt: 4 });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function show(cookCount: number) {
  const cache = buildInMemoryCache();
  const recipe = seedFragment(
    cache,
    CookHistorySummaryFragmentDoc,
    "cookHistorySummary",
    {
      __typename: "Recipe",
      id: LENTIL_SOUP,
      cookCount,
      lastCook:
        cookCount === 0
          ? []
          : [
              {
                __typename: "PlannedRecipeHistory",
                id: LAST.id,
                doneAt: YESTERDAY,
              },
            ],
    },
  );
  render(<CookHistory recipe={recipe} />, {
    cache,
    mocks: [historyListed(HISTORY_PAGE_SIZE, [LAST])],
  });
}

/** I open the summary, awaiting the cooks' first load, which suspends. */
const open = () => act(() => userEvent.click(summary()));

const summary = () =>
  screen.getByRole("button", {
    name: "Last cooked yesterday, and 73 times before",
  });

describe("CookHistory", () => {
  it("shows nothing for a recipe never cooked", () => {
    show(0);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("summarizes the cooks, without listing them", () => {
    show(74);
    expect(summary()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("lists the cooks when opened", async () => {
    show(74);

    await open();

    expect(
      await screen.findByRole("grid", { name: "Cook history" }),
    ).toBeVisible();
  });

  it("keeps the cooks listed when closed and opened again", async () => {
    show(74);

    await open();
    await screen.findByRole("grid", { name: "Cook history" });
    await userEvent.click(summary());
    await userEvent.click(summary());

    expect(screen.getByRole("grid", { name: "Cook history" })).toBeVisible();
  });
});
