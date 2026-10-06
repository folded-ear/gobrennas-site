import { PlanItemStatus } from "@/__generated__/graphql";
import {
  cookBucketData,
  DINNER_BUCKET_IDS,
  holidayDinner,
  holidayItems,
  weeknightDinner,
  weeknightItems,
} from "@/features/cook-recipe/test/buckets";
import { readStatus } from "@/features/page-engine/test/status-cache";
import { PLANNER_PATH } from "@/lib/routes";
import { CookBucketDocument } from "@/screens/__generated__/cook-bucket.generated";
import {
  act,
  buildInMemoryCache,
  render,
  screen,
  userEvent,
  within,
} from "@/test";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CookBucket } from "./cook-bucket";

const back = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back, replace }) }));
beforeEach(() => {
  back.mockReset();
  replace.mockReset();
});

async function show({
  weeknightsMine = true,
  bucketIds = DINNER_BUCKET_IDS,
}: { weeknightsMine?: boolean; bucketIds?: readonly string[] } = {}) {
  const cache = buildInMemoryCache();
  await act(async () => {
    render(
      <Suspense>
        <CookBucket planIds={["7", "9"]} bucketIds={bucketIds} />
      </Suspense>,
      {
        cache,
        mocks: [
          {
            request: { query: CookBucketDocument, variables: { planId: "7" } },
            result: {
              data: cookBucketData("7", "Holidays", holidayItems, [
                holidayDinner,
              ]),
            },
          },
          {
            request: { query: CookBucketDocument, variables: { planId: "9" } },
            result: {
              data: cookBucketData(
                "9",
                "Weeknights",
                weeknightItems,
                [weeknightDinner],
                weeknightsMine,
              ),
            },
          },
        ],
      },
    );
  });
  await screen.findByRole("heading", { level: 1 });
  return cache;
}

function section(name: string) {
  return screen.getByRole("region", { name });
}

describe("CookBucket", () => {
  it("heads the page with its buckets' label", async () => {
    await show();

    expect(
      screen.getByRole("heading", { level: 1, name: /^Dinner – .*Oct 6/ }),
    ).toBeVisible();
  });

  it("shows every plan's roots, each with what's below it", async () => {
    await show();

    expect(section("Holiday apple pie")).toBeVisible();
    expect(section("Crust for Friday")).toBeVisible();
    expect(section("Tacos")).toBeVisible();
  });

  it("offers prep and cooking on each root's section only", async () => {
    await show();

    expect(
      within(section("Holiday apple pie")).getByRole("button", {
        name: "I prepped this: Holiday apple pie",
      }),
    ).toBeVisible();
    expect(
      within(section("Tacos")).getByRole("button", {
        name: "I cooked it: Tacos",
      }),
    ).toBeVisible();
    expect(
      within(section("Crust for Friday")).queryByRole("button", {
        name: /^I prepped this|^I cooked it/,
      }),
    ).toBeNull();
  });

  it("stays put when a root is cooked, with its undo at hand", async () => {
    const cache = await show();

    await userEvent.click(
      screen.getByRole("button", { name: "I cooked it: Holiday apple pie" }),
    );

    expect(back).not.toHaveBeenCalled();
    expect(readStatus(cache, "pie")).toMatchObject({
      pendingStatus: PlanItemStatus.COMPLETED,
    });
    await userEvent.click(
      within(section("Holiday apple pie")).getByRole("button", {
        name: /Wait, no!/,
      }),
    );
    expect(readStatus(cache, "pie")).toMatchObject({ pendingStatus: null });
  });

  it("lets a viewer of a root's plan read it without changing it", async () => {
    await show({ weeknightsMine: false });

    const tacos = section("Tacos");
    expect(within(tacos).getByText("Needs prep")).toBeVisible();
    expect(
      within(tacos).queryByRole("button", { name: /^I cooked it/ }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "I cooked it: Holiday apple pie" }),
    ).toBeVisible();
  });

  it("closes without cooking anything", async () => {
    await show();

    await userEvent.click(screen.getByRole("button", { name: "Close recipe" }));

    expect(back).toHaveBeenCalledOnce();
  });

  it("offers a way back when its buckets hold nothing", async () => {
    await show({ bucketIds: ["gone"] });

    await userEvent.click(
      screen.getByRole("button", { name: "Back to planner" }),
    );

    expect(replace).toHaveBeenCalledWith(PLANNER_PATH);
  });
});
