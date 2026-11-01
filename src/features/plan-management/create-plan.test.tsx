import { act, render, screen, userEvent, waitFor } from "@/test";
import { describe, expect, it, vi } from "vitest";
import {
  CreateManagedPlanDocument,
  type CreateManagedPlanMutation,
} from "./__generated__/management.generated";
import { CreatePlanDialog, PlannerWelcome } from "./create-plan";

const created: CreateManagedPlanMutation = {
  planner: {
    __typename: "PlannerMutation",
    createPlan: {
      __typename: "Plan",
      id: "holiday",
    },
  },
};

describe("CreatePlanDialog", () => {
  it("should reject a blank name and focus the field", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(
      <CreatePlanDialog
        onClose={vi.fn()}
        onCreated={onCreated}
        refreshPlans={vi.fn()}
      />,
    );
    await user.type(screen.getByRole("textbox", { name: "Name" }), "   ");
    await user.click(screen.getByRole("button", { name: "Create plan" }));
    expect(screen.getByText("Enter a plan name.")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("should trim the name and block duplicate submits and dismissal until refresh finishes", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const onClose = vi.fn();
    let finishRefresh = () => {};
    const refreshPlans = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishRefresh = resolve;
        }),
    );
    const result = vi.fn(() => ({ data: created }));
    render(
      <CreatePlanDialog
        onClose={onClose}
        onCreated={onCreated}
        refreshPlans={refreshPlans}
      />,
      {
        mocks: [
          {
            request: {
              query: CreateManagedPlanDocument,
              variables: { name: "Holiday meals" },
            },
            result,
            maxUsageCount: 2,
          },
        ],
      },
    );
    await user.type(
      screen.getByRole("textbox", { name: "Name" }),
      "  Holiday meals  ",
    );
    await user.dblClick(screen.getByRole("button", { name: "Create plan" }));
    expect(
      await screen.findByRole("button", { name: "Refresh plans" }),
    ).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    act(() => finishRefresh());
    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledExactlyOnceWith("holiday"),
    );
    expect(result).toHaveBeenCalledOnce();
    expect(refreshPlans).toHaveBeenCalledOnce();
  });

  it("should preserve a failed draft and allow retry without refreshing on creation failure", async () => {
    const user = userEvent.setup();
    const refreshPlans = vi.fn().mockResolvedValue(undefined);
    const onCreated = vi.fn();
    const request = {
      query: CreateManagedPlanDocument,
      variables: { name: "Holiday meals" },
    };
    render(
      <CreatePlanDialog
        onClose={vi.fn()}
        onCreated={onCreated}
        refreshPlans={refreshPlans}
      />,
      {
        mocks: [
          { request, error: new Error("Unavailable") },
          { request, result: { data: created } },
        ],
      },
    );
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
    expect(refreshPlans).not.toHaveBeenCalled();
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

  it("should retry only the refresh after creation has succeeded", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const refreshPlans = vi
      .fn()
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValueOnce(undefined);
    const result = vi.fn(() => ({ data: created }));
    render(
      <CreatePlanDialog
        onClose={vi.fn()}
        onCreated={onCreated}
        refreshPlans={refreshPlans}
      />,
      {
        mocks: [
          {
            request: {
              query: CreateManagedPlanDocument,
              variables: { name: "Holiday meals" },
            },
            result,
            maxUsageCount: 2,
          },
        ],
      },
    );
    await user.type(
      screen.getByRole("textbox", { name: "Name" }),
      "Holiday meals",
    );
    await user.click(screen.getByRole("button", { name: "Create plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your plan was created, but the planner could not refresh.",
    );
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled();
    expect(onCreated).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Refresh plans" }));
    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledExactlyOnceWith("holiday"),
    );
    expect(result).toHaveBeenCalledOnce();
    expect(refreshPlans).toHaveBeenCalledTimes(2);
  });

  it("should reject a creation response without an identifier before refreshing", async () => {
    const user = userEvent.setup();
    const refreshPlans = vi.fn();
    const onCreated = vi.fn();
    render(
      <CreatePlanDialog
        onClose={vi.fn()}
        onCreated={onCreated}
        refreshPlans={refreshPlans}
      />,
      {
        mocks: [
          {
            request: {
              query: CreateManagedPlanDocument,
              variables: { name: "Holiday meals" },
            },
            result: {
              data: {
                planner: {
                  ...created.planner,
                  createPlan: { __typename: "Plan", id: "" },
                },
              },
            },
          },
        ],
      },
    );
    await user.type(
      screen.getByRole("textbox", { name: "Name" }),
      "Holiday meals",
    );
    await user.click(screen.getByRole("button", { name: "Create plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not create your plan.",
    );
    expect(refreshPlans).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("should allow cancelling without creating a plan", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <CreatePlanDialog
        onClose={onClose}
        onCreated={vi.fn()}
        refreshPlans={vi.fn()}
      />,
    );
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
