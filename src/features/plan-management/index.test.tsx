import { AccessLevel } from "@/__generated__/graphql";
import {
  act,
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
import {
  PlanManagement,
  PlanManagementButton,
  PlanManagementList,
} from "./index";

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

async function chooseRed(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: /Select a plan color$/ }),
  );
  const hue = screen.getByRole("slider", { name: "Hue" });
  for (let index = 0; index < 4 && document.activeElement !== hue; index++) {
    await user.tab();
  }
  expect(hue).toHaveFocus();
  await user.keyboard("{Home}{Escape}");
}

describe("plan management", () => {
  it.each(["name", "color"] as const)(
    "should clear the saved status when the %s field changes",
    async (field) => {
      const user = userEvent.setup();
      render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
        cache: seed(),
      });

      await user.click(screen.getByRole("button", { name: "Save changes" }));
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Changes saved.",
      );
      if (field === "name") {
        await user.type(
          screen.getByRole("textbox", { name: "Name" }),
          " for everyone",
        );
      } else {
        await chooseRed(user);
      }

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).toBeEnabled();
    },
  );

  it("should preserve the color draft when name validation blocks the shared save", async () => {
    const user = userEvent.setup();
    const cache = seed();
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
    await chooseRed(user);
    const name = screen.getByRole("textbox", { name: "Name" });
    await user.clear(name);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Enter a plan name.")).toBeInTheDocument();
    expect(name).toHaveFocus();
    expect(
      cache.readFragment({
        fragment: PlanManagementFragmentDoc,
        id: cache.identify(plan),
      })?.color,
    ).toBe(plan.color);

    await user.type(name, plan.name);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Changes saved.",
    );
    expect(
      cache.readFragment({
        fragment: PlanManagementFragmentDoc,
        id: cache.identify(plan),
      })?.color,
    ).toBe("#783232");
  });

  it.each(["name", "color"] as const)(
    "should save only the edited %s without overwriting an external change",
    async (edited) => {
      const user = userEvent.setup();
      const cache = seed();
      const renamed: RenameManagedPlanMutation = {
        planner: {
          __typename: "PlannerMutation",
          rename: { __typename: "Plan", id: plan.id, name: "Family dinners" },
        },
      };
      const colored: ColorManagedPlanMutation = {
        planner: {
          __typename: "PlannerMutation",
          setColor: { __typename: "Plan", id: plan.id, color: "#783232" },
        },
      };
      render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
        cache,
        mocks:
          edited === "name"
            ? [
                {
                  request: {
                    query: RenameManagedPlanDocument,
                    variables: { id: plan.id, name: "Family dinners" },
                  },
                  result: { data: renamed },
                },
              ]
            : [
                {
                  request: {
                    query: ColorManagedPlanDocument,
                    variables: { id: plan.id, color: "#783232" },
                  },
                  result: { data: colored },
                },
              ],
      });
      if (edited === "name") {
        await user.clear(screen.getByRole("textbox", { name: "Name" }));
        await user.type(
          screen.getByRole("textbox", { name: "Name" }),
          "Family dinners",
        );
      } else {
        await chooseRed(user);
      }
      act(() => {
        cache.writeFragment({
          fragment: PlanManagementFragmentDoc,
          data: {
            ...plan,
            ...(edited === "name"
              ? { color: "#225522" }
              : { name: "Meals from another device" }),
          },
        });
      });
      await user.click(screen.getByRole("button", { name: "Save changes" }));
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Changes saved.",
      );
      expect(
        cache.readFragment({
          fragment: PlanManagementFragmentDoc,
          id: cache.identify(plan),
        }),
      ).toMatchObject(
        edited === "name"
          ? { name: "Family dinners", color: "#225522" }
          : { name: "Meals from another device", color: "#783232" },
      );
    },
  );

  it("should open management directly without a menu", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    render(<PlanManagementButton plans={[plan]} onPress={onPress} />);
    await user.click(screen.getByRole("button", { name: "Manage plans" }));
    expect(onPress).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should list all plans but prevent editing read-only plans", () => {
    const viewerPlan = {
      ...shared(AccessLevel.VIEW),
      id: "shared-plan",
      name: "Shared meals",
    };
    render(
      <PlanManagementList plans={[plan, viewerPlan]} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: plan.name })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Shared meals Read only" }),
    ).toBeDisabled();
  });

  it.each([false, true])(
    "should save both fields with one button and recover from a partial failure (%s)",
    async (failColor) => {
      const user = userEvent.setup();
      const cache = seed();
      const renamed: RenameManagedPlanMutation = {
        planner: {
          __typename: "PlannerMutation",
          rename: { __typename: "Plan", id: plan.id, name: "Family dinners" },
        },
      };
      const colored: ColorManagedPlanMutation = {
        planner: {
          __typename: "PlannerMutation",
          setColor: { __typename: "Plan", id: plan.id, color: "#783232" },
        },
      };
      const colorRequest = {
        query: ColorManagedPlanDocument,
        variables: { id: plan.id, color: "#783232" },
      };
      render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
        cache,
        mocks: [
          {
            request: {
              query: RenameManagedPlanDocument,
              variables: { id: plan.id, name: "Family dinners" },
            },
            result: { data: renamed },
          },
          ...(failColor
            ? [{ request: colorRequest, error: new Error("Offline") }]
            : []),
          { request: colorRequest, result: { data: colored } },
        ],
      });
      const name = screen.getByRole("textbox", { name: "Name" });
      await user.clear(name);
      await user.type(name, "Family dinners");
      await chooseRed(user);
      expect(screen.getAllByRole("button", { name: /Save/ })).toHaveLength(1);
      await user.click(screen.getByRole("button", { name: "Save changes" }));
      if (failColor) {
        expect(await screen.findByRole("alert")).toHaveTextContent(
          "The name was saved, but the color could not be saved",
        );
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(name).toHaveValue("Family dinners");
        expect(
          cache.readFragment({
            fragment: PlanManagementFragmentDoc,
            id: cache.identify(plan),
          }),
        ).toMatchObject({ name: "Family dinners", color: plan.color });
        // Another device edits the already-saved name before the color retry.
        act(() => {
          cache.writeFragment({
            fragment: PlanManagementFragmentDoc,
            data: { ...plan, name: "Meals from another device" },
          });
        });
        await user.click(screen.getByRole("button", { name: "Save changes" }));
      }
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Changes saved.",
      );
      expect(
        cache.readFragment({
          fragment: PlanManagementFragmentDoc,
          id: cache.identify(plan),
        }),
      ).toMatchObject({
        name: failColor ? "Meals from another device" : "Family dinners",
        color: "#783232",
      });
      // A later Save with no new edits must not resend either saved field.
      act(() => {
        cache.writeFragment({
          fragment: PlanManagementFragmentDoc,
          data: { ...plan, name: "Updated elsewhere", color: "#225522" },
        });
      });
      await user.click(screen.getByRole("button", { name: "Save changes" }));
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Changes saved.",
      );
      expect(
        cache.readFragment({
          fragment: PlanManagementFragmentDoc,
          id: cache.identify(plan),
        }),
      ).toMatchObject({ name: "Updated elsewhere", color: "#225522" });
    },
  );

  it("should disable both fields and deletion while saving color", async () => {
    const user = userEvent.setup();
    render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
      cache: seed(),
      mocks: [
        {
          request: {
            query: ColorManagedPlanDocument,
            variables: { id: plan.id, color: "#783232" },
          },
          delay: Infinity,
        },
      ],
    });
    await chooseRed(user);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Select a plan color$/ }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete plan" })).toBeDisabled();
  });
  it("should offer a single plan even when the plan picker would be hidden", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PlanManagementList plans={[plan]} onSelect={onSelect} />);
    expect(screen.getByText("Choose a plan to edit")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: plan.name }));
    expect(onSelect).toHaveBeenCalledWith(plan.id);
  });

  it("should not offer management to a viewer", () => {
    render(
      <PlanManagementButton
        plans={[shared(AccessLevel.VIEW)]}
        onPress={vi.fn()}
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
    expect(
      screen.getByRole("button", { name: /Select a plan color$/ }),
    ).toBeInTheDocument();
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
      screen.getByRole("button", { name: "Save changes" }),
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
    await user.click(screen.getByRole("button", { name: "Save changes" }));
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
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save changes",
    );
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
      "Family dinners",
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
  });

  it("should disable management controls while saving the name", async () => {
    const user = userEvent.setup();
    render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
      cache: seed(),
      mocks: [
        {
          request: {
            query: RenameManagedPlanDocument,
            variables: { id: plan.id, name: "Family dinners" },
          },
          delay: Infinity,
        },
      ],
    });
    await user.clear(screen.getByRole("textbox", { name: "Name" }));
    await user.type(
      screen.getByRole("textbox", { name: "Name" }),
      "Family dinners",
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Select a plan color$/ }),
    ).toBeDisabled();
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
            descendants {
              id
              name
            }
            buckets {
              id
              name
            }
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
            {
              ...plan,
              descendants: [
                {
                  __typename: "PlanItem",
                  id: "weeknight-item",
                  name: "Roasted vegetables",
                },
              ],
              buckets: [
                {
                  __typename: "PlanBucket",
                  id: "weeknight-bucket",
                  name: "Dinner prep",
                },
              ],
            },
            {
              __typename: "Plan",
              id: "holiday-plan",
              name: "Thanksgiving",
              descendants: [],
              buckets: [],
            },
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
          {
            __typename: "Plan",
            id: "holiday-plan",
            name: "Thanksgiving",
            descendants: [],
            buckets: [],
          },
        ],
      },
    });
    expect(cache.extract()).not.toHaveProperty("PlanItem:weeknight-item");
    expect(cache.extract()).not.toHaveProperty("PlanBucket:weeknight-bucket");
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
    await chooseRed(user);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
    expect(
      cache.readFragment({
        fragment: PlanManagementFragmentDoc,
        id: cache.identify(plan),
      })?.color,
    ).toBe("#783232");
  });
});
