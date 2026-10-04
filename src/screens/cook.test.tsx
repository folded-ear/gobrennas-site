import { AccessLevel, PlanItemStatus } from "@/__generated__/graphql";
import {
  cookData,
  crust,
  ingredients,
  item,
  pie,
  ref,
  savedRecipe,
} from "@/features/cook-recipe/test/recipe";
import { readStatus } from "@/features/page-engine/test/status-cache";
import { savedStatuses } from "@/features/page-engine/test/status-mocks";
import { CookDocument } from "@/screens/__generated__/cook.generated";
import {
  act,
  buildInMemoryCache,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test";
import type { MockLink } from "@apollo/client/testing";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Cook } from "./cook";

const back = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back, replace }) }));
beforeEach(() => {
  back.mockReset();
  replace.mockReset();
});

async function show(
  data = cookData(),
  itemId = "pie",
  mutations: readonly MockLink.MockedResponse[] = [],
) {
  const cache = buildInMemoryCache();
  await act(async () => {
    render(
      <Suspense>
        <Cook planId="7" itemId={itemId} />
      </Suspense>,
      {
        cache,
        mocks: [
          {
            request: { query: CookDocument, variables: { planId: "7" } },
            result: { data },
          },
          ...mutations,
        ],
      },
    );
  });
  await screen.findByRole("heading", { level: 1 });
  return cache;
}

describe("Cook", () => {
  it("shows the planned recipe with readable ingredients, directions, metadata and prep", async () => {
    await show();
    expect(
      screen.getByRole("heading", { level: 1, name: "Holiday apple pie" }),
    ).toBeVisible();
    expect(screen.getByText("Holiday dinner")).toBeVisible();
    expect(screen.getByText("16 servings")).toBeVisible();
    expect(screen.getByText("4")).toHaveClass("morsel-quantity");
    expect(screen.getByText("apples")).toHaveClass("morsel-ingredient");
    expect(screen.getByText("a pinch of mystery spice")).toBeVisible();
    expect(screen.getByText(/Bake the original pie/).textContent).toBe(
      "Bake the original pie.\n\nLet cool before slicing.",
    );
    expect(
      within(
        screen.getByRole("region", { name: "Crust for Friday" }),
      ).getByText("Chill the dough."),
    ).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit|delete|add to plan/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "I prepped this: Holiday apple pie" }),
    ).toBeVisible();
  });

  it("keeps details collapsed and opens the thumbnail without leaving Cook", async () => {
    const user = userEvent.setup();
    await show(
      cookData([
        {
          ...pie,
          ingredient: {
            ...savedRecipe,
            photo: {
              __typename: "Photo",
              url: "/recipe-box.jpg",
              focus: [0.5, 0.5],
            },
          },
        },
        ...ingredients,
      ]),
    );
    const details = screen.getByRole("button", { name: "Recipe details" });
    expect(details).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("16 servings")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "https://example.test/apple-pie" }),
    ).not.toBeInTheDocument();
    await user.click(details);
    expect(details).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("link", { name: "https://example.test/apple-pie" }),
    ).toBeVisible();
    expect(screen.getByText("1 hr 20 min")).toBeVisible();
    await user.click(details);
    expect(details).toHaveAttribute("aria-expanded", "false");
    const photo = screen.getByRole("button", {
      name: "View photo of Holiday apple pie",
    });
    await user.click(photo);
    expect(
      screen.getByRole("dialog", { name: "Holiday apple pie" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("dialog")).getByRole("img", {
        name: "Apple pie",
      }),
    ).toBeVisible();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(photo).toHaveFocus());
    expect(back).not.toHaveBeenCalled();
  });

  it("uses planned directions and still shows prep that was already completed elsewhere", async () => {
    await show(
      cookData([
        {
          ...pie,
          notes: "Bake in the smaller oven.",
          children: [ref("apples")],
        },
        ...ingredients.filter((entry) => entry.id !== "crust"),
        { ...crust, status: PlanItemStatus.COMPLETED },
      ]),
    );
    expect(screen.getByText("Bake in the smaller oven.")).toBeVisible();
    expect(screen.queryByText(/Bake the original pie/)).not.toBeInTheDocument();
    expect(screen.getByText("Already prepared")).toBeVisible();
    expect(screen.getByText("Chill the dough.")).toBeVisible();
  });

  it("returns to the planner after marking the occurrence cooked and keeps its undo pending", async () => {
    const cache = await show();
    await userEvent.click(
      screen.getByRole("button", { name: "I cooked it: Holiday apple pie" }),
    );
    expect(back).toHaveBeenCalledOnce();
    expect(readStatus(cache, "pie")).toMatchObject({
      pendingStatus: PlanItemStatus.COMPLETED,
      status: PlanItemStatus.NEEDED,
    });
    // Navigation is mocked, so the shared undo action is still available here.
    await userEvent.click(screen.getByRole("button", { name: /Wait, no!/ }));
    expect(readStatus(cache, "pie")).toMatchObject({ pendingStatus: null });
  });

  it("saves prep as acquired without leaving Cook, and can undo it", async () => {
    const cache = await show(cookData(), "pie", [
      savedStatuses([{ id: "pie", status: PlanItemStatus.ACQUIRED }]),
      savedStatuses([{ id: "pie", status: PlanItemStatus.NEEDED }]),
    ]);
    await userEvent.click(
      screen.getByRole("button", { name: "I prepped this: Holiday apple pie" }),
    );
    const prepped = await screen.findByRole("button", {
      name: "Prepped. Undo prep: Holiday apple pie",
    });
    expect(prepped).toHaveAttribute("aria-pressed", "true");
    expect(cache.extract()["PlanItem:pie"]).toMatchObject({
      status: PlanItemStatus.ACQUIRED,
      pendingStatus: null,
    });
    expect(
      screen.getByRole("button", { name: "I cooked it: Holiday apple pie" }),
    ).toBeEnabled();
    expect(back).not.toHaveBeenCalled();
    await userEvent.click(prepped);
    await waitFor(() =>
      expect(cache.extract()["PlanItem:pie"]).toMatchObject({
        status: PlanItemStatus.NEEDED,
        pendingStatus: null,
      }),
    );
    expect(
      screen.getByRole("button", { name: "I prepped this: Holiday apple pie" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("shows prep as done before the server answers", async () => {
    await show(cookData(), "pie", [
      savedStatuses([{ id: "pie", status: PlanItemStatus.ACQUIRED }], {
        delay: Infinity,
      }),
    ]);

    await userEvent.click(
      screen.getByRole("button", { name: "I prepped this: Holiday apple pie" }),
    );

    expect(
      await screen.findByRole("button", {
        name: "Prepped. Undo prep: Holiday apple pie",
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("closes without marking the recipe cooked", async () => {
    const cache = await show();
    await userEvent.click(screen.getByRole("button", { name: "Close recipe" }));
    expect(back).toHaveBeenCalledOnce();
    expect(cache.extract()["PlanItem:pie"]).toMatchObject({
      pendingStatus: null,
      status: PlanItemStatus.NEEDED,
    });
  });

  it("lets viewers read without changing status or marking cooked", async () => {
    await show(cookData(undefined, false));
    expect(screen.getByText("Needs prep")).toBeVisible();
    expect(
      screen.queryByRole("button", {
        name: /^I cooked it|^I prepped this|^Prepped/,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Bake the original pie/)).toBeVisible();
  });

  it("allows someone with change access to a shared plan to mark it cooked", async () => {
    const data = cookData(undefined, false);
    data.planner.plan.grants = [
      {
        __typename: "AccessControlEntry",
        level: AccessLevel.CHANGE,
        user: { __typename: "User", id: "me", me: true },
      },
    ];
    await show(data);
    expect(
      screen.getByRole("button", { name: "I cooked it: Holiday apple pie" }),
    ).toBeEnabled();
  });

  it("keeps an unlinked recipe readable and explains missing content", async () => {
    await show(cookData([item("pie", "Family soup")]));
    expect(screen.getByRole("heading", { name: "Family soup" })).toBeVisible();
    expect(screen.getByText("No ingredients listed.")).toBeVisible();
    expect(screen.getByText("No directions provided.")).toBeVisible();
  });

  it("offers a way back when the recipe is missing from the requested plan", async () => {
    await show(
      cookData([{ ...pie, plan: { __typename: "Plan", id: "another-plan" } }]),
    );
    expect(
      screen.getByRole("heading", { name: "Recipe unavailable" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /^I cooked it/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Back to planner" }),
    );
    expect(replace).toHaveBeenCalledWith("/plan");
  });
});
