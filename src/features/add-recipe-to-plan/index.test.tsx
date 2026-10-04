import { AccessLevel } from "@/__generated__/graphql";
import { DoSendToPlanDocument } from "@/features/send-to-plan/__generated__/doSendToPlan.generated";
import { FAILURE_TOAST_TITLE } from "@/lib/apollo/failure-toast-link";
import { buildInMemoryCache, render, screen, userEvent, waitFor } from "@/test";
import { gql } from "@apollo/client";
import { describe, expect, it, vi } from "vitest";
import {
  RecipePlanChoicesDocument,
  type RecipePlanChoicesQuery,
} from "./__generated__/recipePlanChoices.generated";
import { AddRecipeToPlan } from "./index";

type Plan = RecipePlanChoicesQuery["planner"]["plans"][number];
const own: Plan = {
  __typename: "Plan",
  id: "week",
  name: "This week",
  mine: true,
  grants: [],
};
const shared: Plan = {
  __typename: "Plan",
  id: "party",
  name: "Party",
  mine: false,
  grants: [
    {
      __typename: "AccessControlEntry",
      level: AccessLevel.CHANGE,
      user: { __typename: "User", id: "me", me: true },
    },
  ],
};
const readonly: Plan = {
  ...shared,
  id: "readonly",
  name: "Read only",
  grants: [{ ...shared.grants[0], level: AccessLevel.VIEW }],
};
const request = {
  query: DoSendToPlanDocument,
  variables: { recipeId: "pie", planId: "party" },
};
const result = {
  data: {
    library: {
      __typename: "LibraryMutation" as const,
      sendRecipeToPlan: { __typename: "PlanItem" as const, id: "added-pie" },
    },
  },
};

function show(
  plans: Plan[] = [readonly, shared, own],
  mocks: Parameters<typeof render>[1] = {},
) {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: RecipePlanChoicesDocument,
    data: { planner: { __typename: "PlannerQuery", plans } },
  });
  render(<AddRecipeToPlan recipeId="pie" />, { cache, ...mocks });
  return cache;
}

async function chooseParty() {
  await userEvent.click(screen.getByRole("button", { name: "Add to plan" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Party" }));
}

describe("AddRecipeToPlan", () => {
  it("offers owned and editable shared plans, with no read-only destinations", async () => {
    show();
    await userEvent.click(screen.getByRole("button", { name: "Add to plan" }));
    expect(
      screen.getAllByRole("menuitem").map((item) => item.textContent),
    ).toEqual(["This week", "Party"]);
  });

  it("explains when there are no editable plans", async () => {
    show([readonly]);
    await userEvent.click(screen.getByRole("button", { name: "Add to plan" }));
    expect(
      screen.getByRole("menuitem", { name: "No editable plans" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("adds once to the chosen plan, confirms success and invalidates cached plan contents", async () => {
    const send = vi.fn(() => result);
    const cache = show(undefined, {
      mocks: [{ request, result: send, delay: 100 }],
    });
    const contents = gql`
      fragment CachedPlanContents on Plan {
        id
        children {
          id
        }
        descendants {
          id
        }
        childCount
        descendantCount
      }
    `;
    const id = cache.identify({ __typename: "Plan", id: "party" });
    cache.writeFragment({
      id,
      fragment: contents,
      data: {
        __typename: "Plan",
        id: "party",
        children: [],
        descendants: [],
        childCount: 0,
        descendantCount: 0,
      },
    });
    await chooseParty();
    expect(screen.getByRole("button", { name: "Adding…" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Adding…" }));
    expect(await screen.findByText("Added to Party")).toBeVisible();
    expect(send).toHaveBeenCalledTimes(1);
    expect(cache.readFragment({ id, fragment: contents })).toBeNull();
    expect(screen.getByRole("button", { name: "Add to plan" })).toBeEnabled();
  });

  it("reports a failed addition and lets the user retry", async () => {
    show(undefined, {
      mocks: [
        { request, error: new Error("Offline") },
        { request, result },
      ],
    });
    await chooseParty();
    expect(
      await screen.findByText("Couldn’t add recipe to plan"),
    ).toBeVisible();
    expect(screen.queryByText(FAILURE_TOAST_TITLE)).not.toBeInTheDocument();
    await chooseParty();
    expect(await screen.findByText("Added to Party")).toBeVisible();
  });

  it("loads plans only when requested and recovers from a query failure", async () => {
    const load = vi.fn(() => ({
      data: { planner: { __typename: "PlannerQuery", plans: [own] } },
    }));
    render(<AddRecipeToPlan recipeId="pie" />, {
      mocks: [
        {
          request: { query: RecipePlanChoicesDocument },
          error: new Error("Offline"),
        },
        { request: { query: RecipePlanChoicesDocument }, result: load },
      ],
    });
    expect(load).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Add to plan" }));
    await userEvent.click(
      await screen.findByRole("menuitem", {
        name: "Couldn’t load plans. Try again",
      }),
    );
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole("button", { name: "Add to plan" }));
    expect(
      await screen.findByRole("menuitem", { name: "This week" }),
    ).toBeVisible();
  });
});
