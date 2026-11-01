import { buildInMemoryCache, render, screen, userEvent, waitFor } from "@/test";
import type { Unmasked } from "@apollo/client/masking";
import { describe, expect, it, vi } from "vitest";
import {
  CreateManagedPlanDocument,
  ManagedPlanMembershipDocument,
  type CreateManagedPlanMutation,
} from "./__generated__/management.generated";
import { CreatePlanDialog, PlannerWelcome } from "./create-plan";

const created: Unmasked<CreateManagedPlanMutation> = {
  planner: {
    __typename: "PlannerMutation",
    createPlan: {
      __typename: "Plan",
      id: "holiday",
      name: "Holiday meals",
      color: "#325578",
      mine: true,
      grants: [],
      ownedBy: null,
      notes: null,
      children: [],
      descendants: [],
      buckets: [],
    },
  },
};

function membershipCache() {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: ManagedPlanMembershipDocument,
    data: {
      planner: {
        __typename: "PlannerQuery",
        plans: [{ __typename: "Plan", id: "weeknights" }],
      },
    },
  });
  return cache;
}

describe("CreatePlanDialog", () => {
  it("should reject a blank name and focus the field", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<CreatePlanDialog onClose={vi.fn()} onCreated={onCreated} />);
    await user.type(screen.getByRole("textbox", { name: "Name" }), "   ");
    await user.click(screen.getByRole("button", { name: "Create plan" }));
    expect(screen.getByText("Enter a plan name.")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("should trim the name, prevent duplicate submits, and append the created plan", async () => {
    const user = userEvent.setup();
    const cache = membershipCache();
    const onCreated = vi.fn();
    const onClose = vi.fn();
    render(<CreatePlanDialog onClose={onClose} onCreated={onCreated} />, {
      cache,
      mocks: [
        {
          request: {
            query: CreateManagedPlanDocument,
            variables: { name: "Holiday meals" },
          },
          result: { data: created },
          delay: 100,
        },
      ],
    });
    await user.type(
      screen.getByRole("textbox", { name: "Name" }),
      "  Holiday meals  ",
    );
    await user.dblClick(screen.getByRole("button", { name: "Create plan" }));
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledExactlyOnceWith("holiday"),
    );
    expect(
      cache
        .readQuery({ query: ManagedPlanMembershipDocument })
        ?.planner.plans.map((plan) => plan.id),
    ).toEqual(["weeknights", "holiday"]);
  });

  it("should preserve a failed draft and allow retry without changing membership on failure", async () => {
    const user = userEvent.setup();
    const cache = membershipCache();
    const onCreated = vi.fn();
    const request = {
      query: CreateManagedPlanDocument,
      variables: { name: "Holiday meals" },
    };
    render(<CreatePlanDialog onClose={vi.fn()} onCreated={onCreated} />, {
      cache,
      mocks: [
        { request, error: new Error("Unavailable") },
        { request, result: { data: created } },
      ],
    });
    await user.type(
      screen.getByRole("textbox", { name: "Name" }),
      "Holiday meals",
    );
    await user.click(screen.getByRole("button", { name: "Create plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not create your plan.",
    );
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
      "Holiday meals",
    );
    expect(
      cache
        .readQuery({ query: ManagedPlanMembershipDocument })
        ?.planner.plans.map((plan) => plan.id),
    ).toEqual(["weeknights"]);
    await user.type(screen.getByRole("textbox", { name: "Name" }), "s");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.clear(screen.getByRole("textbox", { name: "Name" }));
    await user.type(
      screen.getByRole("textbox", { name: "Name" }),
      "Holiday meals",
    );
    await user.click(screen.getByRole("button", { name: "Create plan" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("holiday"));
  });

  it("should allow cancelling without creating a plan", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CreatePlanDialog onClose={onClose} onCreated={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

it("should welcome a new planner user with a prominent creation action", async () => {
  const user = userEvent.setup();
  const onCreate = vi.fn();
  render(<PlannerWelcome onCreate={onCreate} />);
  expect(
    screen.getByRole("heading", { name: "Make room for something delicious" }),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Create a plan" }));
  expect(onCreate).toHaveBeenCalledOnce();
});
