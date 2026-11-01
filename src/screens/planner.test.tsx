import { pollQuery } from "@/features/page-engine/mutation";
import {
  CreateManagedPlanDocument,
  DeleteManagedPlanDocument,
} from "@/features/plan-management/__generated__/management.generated";
import { PreferenceValueFragmentDoc } from "@/hooks/use-preference/__generated__/preferenceValue.generated";
import { DoSetPreferenceDocument } from "@/hooks/use-set-preference/__generated__/doSetPreference.generated";
import { InitializeDeviceKeyDocument } from "@/lib/apollo/__generated__/initializeDeviceKey.generated";
import { PREF_PLANNER_PLANS, formatIdSet } from "@/lib/preferences";
import {
  buildInMemoryCache,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test";
import type { Unmasked } from "@apollo/client/masking";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PlannerDocument,
  type PlannerQuery,
} from "./__generated__/planner.generated";
import { Planner } from "./planner";

const back = vi.fn(() => window.history.back());
vi.mock("next/navigation", () => ({ useRouter: () => ({ back }) }));

const plan: Unmasked<PlannerQuery>["planner"]["plans"][number] = {
  __typename: "Plan",
  id: "weeknight-plan",
  name: "Weeknight dinners",
  color: "#325578",
  mine: true,
  grants: [],
  ownedBy: null,
  notes: null,
  buckets: [],
  children: [],
  descendants: [],
};

beforeEach(() => {
  back.mockClear();
  window.history.replaceState(null, "");
});

function plannerCache(
  plans: readonly Unmasked<PlannerQuery>["planner"]["plans"][number][] = [plan],
) {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: PlannerDocument,
    data: { planner: { __typename: "PlannerQuery", plans: [...plans] } },
  });
  cache.writeFragment({
    id: cache.identify({
      __typename: "UserPreference",
      name: PREF_PLANNER_PLANS,
    }),
    fragment: PreferenceValueFragmentDoc,
    data: {
      __typename: "UserPreference",
      value: formatIdSet(plans.length ? [plan.id] : []),
    },
  });
  return cache;
}

function pollingMock(planId = plan.id) {
  return {
    request: pollQuery([{ planId, cutoff: -7500 }]),
    result: { data: { planner: { __typename: "PlannerQuery", p0: [] } } },
  };
}

describe("planner management drawer", () => {
  it.each([false, true])(
    "should create and select a plan while preserving existing selections (has plans: %s)",
    async (hasPlans) => {
      const user = userEvent.setup();
      const cache = plannerCache(hasPlans ? [plan] : []);
      cache.writeQuery({
        query: InitializeDeviceKeyDocument,
        data: { deviceKey: "planner-device" },
      });
      const newPlan = { ...plan, id: "holiday-plan", name: "Holiday meals" };
      const value = formatIdSet(
        hasPlans ? [plan.id, newPlan.id] : [newPlan.id],
      );
      render(<Planner />, {
        cache,
        mocks: [
          ...(hasPlans ? [pollingMock()] : []),
          {
            request: {
              query: CreateManagedPlanDocument,
              variables: { name: newPlan.name },
            },
            result: {
              data: {
                planner: { __typename: "PlannerMutation", createPlan: newPlan },
              },
            },
          },
          {
            request: {
              query: DoSetPreferenceDocument,
              variables: {
                name: PREF_PLANNER_PLANS,
                value,
                deviceKey: "planner-device",
              },
            },
            result: {
              data: {
                profile: {
                  __typename: "ProfileMutation",
                  setPreference: {
                    __typename: "UserPreference",
                    name: PREF_PLANNER_PLANS,
                    value,
                  },
                },
              },
            },
          },
          ...(hasPlans
            ? [
                {
                  request: {
                    query: pollQuery([
                      { planId: plan.id, cutoff: -7500 },
                      { planId: newPlan.id, cutoff: -7500 },
                    ]).query,
                    variables: (variables: Record<string, unknown>) =>
                      variables.planId0 === plan.id &&
                      variables.planId1 === newPlan.id,
                  },
                  result: {
                    data: {
                      planner: { __typename: "PlannerQuery", p0: [], p1: [] },
                    },
                  },
                },
              ]
            : [pollingMock(newPlan.id)]),
        ],
      });
      await user.click(
        screen.getByRole("button", {
          name: hasPlans ? "New plan" : "Create a plan",
        }),
      );
      await user.type(
        screen.getByRole("textbox", { name: "Name" }),
        newPlan.name,
      );
      await user.click(screen.getByRole("button", { name: "Create plan" }));
      expect(
        await screen.findByRole("button", { name: newPlan.name }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.queryByRole("dialog", { name: "New plan" }),
      ).not.toBeInTheDocument();
      if (hasPlans)
        expect(screen.getByRole("button", { name: plan.name })).toHaveAttribute(
          "aria-pressed",
          "true",
        );
      expect(
        cache
          .readQuery({ query: PlannerDocument })
          ?.planner.plans.map((item) => item.id),
      ).toEqual(hasPlans ? [plan.id, newPlan.id] : [newPlan.id]);
    },
  );

  it("should select the first remaining plan after deleting the only selected plan", async () => {
    const user = userEvent.setup();
    const nextPlan = { ...plan, id: "holiday-plan", name: "Thanksgiving" };
    const lastPlan = { ...plan, id: "weekend-plan", name: "Weekend meals" };
    render(<Planner />, {
      cache: plannerCache([plan, nextPlan, lastPlan]),
      mocks: [
        pollingMock(),
        pollingMock(nextPlan.id),
        {
          request: {
            query: DeleteManagedPlanDocument,
            variables: { id: plan.id },
          },
          result: {
            data: {
              planner: {
                __typename: "PlannerMutation",
                deletePlan: { __typename: "Deletion", id: plan.id },
              },
            },
          },
        },
      ],
    });
    expect(screen.getByRole("button", { name: plan.name })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(
      screen.getByRole("button", { name: `Options for ${plan.name}` }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Plan settings" }));
    await user.click(screen.getByRole("button", { name: "Delete plan" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Delete plan",
      }),
    );
    const drawer = await screen.findByRole("dialog", { name: "Manage plans" });
    expect(
      within(drawer).queryByRole("button", { name: plan.name }),
    ).not.toBeInTheDocument();
    expect(
      within(drawer).getByRole("button", { name: nextPlan.name }),
    ).toBeInTheDocument();
    await user.click(within(drawer).getByRole("button", { name: /close/i }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: nextPlan.name })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.queryByRole("button", { name: plan.name }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: lastPlan.name })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("should open management in the shared drawer and close through history", async () => {
    const user = userEvent.setup();
    render(<Planner />, { cache: plannerCache(), mocks: [pollingMock()] });
    await user.click(
      screen.getByRole("button", { name: `Options for ${plan.name}` }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Plan settings" }));
    const drawer = screen.getByRole("dialog", { name: `Manage ${plan.name}` });
    expect(drawer).toHaveClass("sm:max-w-lg");
    expect(within(drawer).getByRole("textbox", { name: "Name" })).toHaveValue(
      plan.name,
    );
    await user.click(
      within(drawer).getByRole("button", { name: "Back to all plans" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Manage plans" }),
    ).toBeInTheDocument();
    expect(back).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(back).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: "Planner", level: 1 }),
    ).toBeInTheDocument();
  });

  it("should return to the empty management list after deleting the last plan", async () => {
    const user = userEvent.setup();
    render(<Planner />, {
      cache: plannerCache(),
      mocks: [
        pollingMock(),
        {
          request: {
            query: DeleteManagedPlanDocument,
            variables: { id: plan.id },
          },
          result: {
            data: {
              planner: {
                __typename: "PlannerMutation",
                deletePlan: { __typename: "Deletion", id: plan.id },
              },
            },
          },
        },
      ],
    });
    await user.click(
      screen.getByRole("button", { name: `Options for ${plan.name}` }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Plan settings" }));
    await user.click(screen.getByRole("button", { name: "Delete plan" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Delete plan",
      }),
    );
    expect(
      await screen.findByText("There are no plans to manage."),
    ).toBeInTheDocument();
    expect(back).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(back).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Manage plans" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create a plan" }),
    ).toBeInTheDocument();
  });
});
