import { AccessLevel } from "@/__generated__/graphql";
import {
  buildInMemoryCache,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test";
import { gql } from "@apollo/client";
import { describe, expect, it, vi } from "vitest";
import {
  ColorManagedPlanDocument,
  DeleteManagedPlanDocument,
  PlanManagementFragmentDoc,
  RenameManagedPlanDocument,
  type ColorManagedPlanMutation,
  type DeleteManagedPlanMutation,
  type PlanManagementFragment,
  type RenameManagedPlanMutation,
} from "./__generated__/management.generated";
import { PlanManagement, PlanManagementMenu } from "./index";

const plan: PlanManagementFragment = {
  __typename: "Plan",
  id: "weeknight-plan",
  name: "Weeknight dinners",
  color: "#325578",
  mine: true,
  grants: [],
};

function seed(value = plan) {
  const cache = buildInMemoryCache();
  cache.writeFragment({ fragment: PlanManagementFragmentDoc, data: value });
  return cache;
}

function shared(level: AccessLevel): PlanManagementFragment {
  return {
    ...plan,
    mine: false,
    grants: [
      {
        __typename: "AccessControlEntry",
        level,
        user: { __typename: "User", id: "me", me: true },
      },
    ],
  };
}

describe("plan management", () => {
  it("should offer a single plan even when the plan picker would be hidden", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PlanManagementMenu plans={[plan]} onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: "Manage plans" }));
    await user.click(screen.getByRole("menuitem", { name: plan.name }));
    expect(onSelect).toHaveBeenCalledWith(plan.id);
  });

  it("should not offer management to a viewer", () => {
    render(
      <PlanManagementMenu
        plans={[shared(AccessLevel.VIEW)]}
        onSelect={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Manage plans" }),
    ).not.toBeInTheDocument();
  });

  it("should render the current name, color picker, and delete action", () => {
    render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
      cache: seed(),
    });
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
      plan.name,
    );
    expect(screen.getByRole("button", { name: / Color$/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete plan" }),
    ).toBeInTheDocument();
  });

  it("should allow change access to rename and recolor but not delete", () => {
    const value = shared(AccessLevel.CHANGE);
    render(<PlanManagement plan={value} onDeleted={vi.fn()} />, {
      cache: seed(value),
    });
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
      plan.name,
    );
    expect(
      screen.getByRole("button", { name: "Save color" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete plan" }),
    ).not.toBeInTheDocument();
  });

  it("should offer deletion to a shared administrator", () => {
    const value = shared(AccessLevel.ADMINISTER);
    render(<PlanManagement plan={value} onDeleted={vi.fn()} />, {
      cache: seed(value),
    });
    expect(
      screen.getByRole("button", { name: "Delete plan" }),
    ).toBeInTheDocument();
  });

  it("should reject a blank name and focus the field", async () => {
    const user = userEvent.setup();
    render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
      cache: seed(),
    });
    const name = screen.getByRole("textbox", { name: "Name" });
    await user.clear(name);
    await user.type(name, "   ");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(await screen.findByText("Enter a plan name.")).toBeInTheDocument();
    expect(name).toHaveFocus();
  });

  it("should trim and save a name in the shared cache", async () => {
    const user = userEvent.setup();
    const cache = seed();
    const data: RenameManagedPlanMutation = {
      planner: {
        __typename: "PlannerMutation",
        rename: { __typename: "Plan", id: plan.id, name: "Family dinners" },
      },
    };
    render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
      cache,
      mocks: [
        {
          request: {
            query: RenameManagedPlanDocument,
            variables: { id: plan.id, name: "Family dinners" },
          },
          result: { data },
        },
      ],
    });
    await user.clear(screen.getByRole("textbox", { name: "Name" }));
    await user.type(
      screen.getByRole("textbox", { name: "Name" }),
      "  Family dinners  ",
    );
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(await screen.findByText("Name saved.")).toBeInTheDocument();
    expect(
      cache.readFragment({
        fragment: PlanManagementFragmentDoc,
        id: cache.identify(plan),
      })?.name,
    ).toBe("Family dinners");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
      "Family dinners",
    );
  });

  it("should keep the draft and allow retry after a failed rename", async () => {
    const user = userEvent.setup();
    const data: RenameManagedPlanMutation = {
      planner: {
        __typename: "PlannerMutation",
        rename: { __typename: "Plan", id: plan.id, name: "Family dinners" },
      },
    };
    const request = {
      query: RenameManagedPlanDocument,
      variables: { id: plan.id, name: "Family dinners" },
    };
    render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
      cache: seed(),
      mocks: [
        { request, error: new Error("Offline") },
        { request, result: { data } },
      ],
    });
    await user.clear(screen.getByRole("textbox", { name: "Name" }));
    await user.type(
      screen.getByRole("textbox", { name: "Name" }),
      "Family dinners",
    );
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save the name",
    );
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
      "Family dinners",
    );
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(await screen.findByText("Name saved.")).toBeInTheDocument();
  });

  it("should disable management controls while saving the name", async () => {
    const user = userEvent.setup();
    render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
      cache: seed(),
      mocks: [
        {
          request: {
            query: RenameManagedPlanDocument,
            variables: { id: plan.id, name: plan.name },
          },
          delay: Infinity,
        },
      ],
    });
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save color" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete plan" })).toBeDisabled();
  });

  it("should ask before deleting and leave the plan untouched on cancel", async () => {
    const user = userEvent.setup();
    const cache = seed();
    const onDeleted = vi.fn();
    render(<PlanManagement plan={plan} onDeleted={onDeleted} />, { cache });
    await user.click(screen.getByRole("button", { name: "Delete plan" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "permanently deletes",
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDeleted).not.toHaveBeenCalled();
    expect(
      cache.readFragment({
        fragment: PlanManagementFragmentDoc,
        id: cache.identify(plan),
      })?.name,
    ).toBe(plan.name);
  });

  it("should remove a deleted plan from cached lists without affecting other plans", async () => {
    const user = userEvent.setup();
    const cache = seed();
    const onDeleted = vi.fn();
    const query = gql`
      query ManagementPlans {
        planner {
          plans {
            id
            name
          }
        }
      }
    `;
    cache.writeQuery({
      query,
      data: {
        planner: {
          __typename: "PlannerQuery",
          plans: [
            plan,
            { __typename: "Plan", id: "holiday-plan", name: "Thanksgiving" },
          ],
        },
      },
    });
    const data: DeleteManagedPlanMutation = {
      planner: {
        __typename: "PlannerMutation",
        deletePlan: { __typename: "Deletion", id: plan.id },
      },
    };
    render(<PlanManagement plan={plan} onDeleted={onDeleted} />, {
      cache,
      mocks: [
        {
          request: {
            query: DeleteManagedPlanDocument,
            variables: { id: plan.id },
          },
          result: { data },
        },
      ],
    });
    await user.click(screen.getByRole("button", { name: "Delete plan" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Delete plan",
      }),
    );
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    expect(cache.readQuery({ query })).toEqual({
      planner: {
        __typename: "PlannerQuery",
        plans: [
          { __typename: "Plan", id: "holiday-plan", name: "Thanksgiving" },
        ],
      },
    });
  });

  it("should keep the plan and confirmation available after deletion fails", async () => {
    const user = userEvent.setup();
    const cache = seed();
    const onDeleted = vi.fn();
    render(<PlanManagement plan={plan} onDeleted={onDeleted} />, {
      cache,
      mocks: [
        {
          request: {
            query: DeleteManagedPlanDocument,
            variables: { id: plan.id },
          },
          error: new Error("Offline"),
        },
      ],
    });
    await user.click(screen.getByRole("button", { name: "Delete plan" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Delete plan",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Plan could not be deleted",
    );
    expect(onDeleted).not.toHaveBeenCalled();
    expect(
      cache.readFragment({
        fragment: PlanManagementFragmentDoc,
        id: cache.identify(plan),
      })?.name,
    ).toBe(plan.name);
  });

  it("should select and save a color using the HeroUI picker", async () => {
    const user = userEvent.setup();
    const cache = seed();
    // Moving hue to its minimum chooses red while retaining saturation/brightness.
    const data: ColorManagedPlanMutation = {
      planner: {
        __typename: "PlannerMutation",
        setColor: { __typename: "Plan", id: plan.id, color: "#783232" },
      },
    };
    render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
      cache,
      mocks: [
        {
          request: {
            query: ColorManagedPlanDocument,
            variables: { id: plan.id, color: "#783232" },
          },
          result: { data },
        },
      ],
    });
    await user.click(screen.getByRole("button", { name: / Color$/ }));
    const hue = screen.getByRole("slider", { name: "Hue" });
    for (let index = 0; index < 4 && document.activeElement !== hue; index++) {
      await user.tab();
    }
    expect(hue).toHaveFocus();
    await user.keyboard("{Home}{Escape}");
    await user.click(screen.getByRole("button", { name: "Save color" }));
    expect(await screen.findByText("Color saved.")).toBeInTheDocument();
    expect(
      cache.readFragment({
        fragment: PlanManagementFragmentDoc,
        id: cache.identify(plan),
      })?.color,
    ).toBe("#783232");
  });
});
