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
const planBar = () => screen.getByRole("group", { name: "Planner plans" });
vi.mock("next/navigation", () => ({ useRouter: () => ({ back }) }));

const plan: Unmasked<PlannerQuery>["planner"]["plans"][number] = {
  __typename: "Plan",
  id: "weeknight-plan",
  name: "Weeknight dinners",
  color: "#325578",
  mine: true,
  grants: [],
  ownedBy: null,
  owner: {
    __typename: "User",
    id: "me",
    name: "Barney Boisvert",
    email: "barney@example.com",
    imageUrl: null,
  },
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
  it("should open the all-plans drawer from the settings button in the page header", async () => {
    const user = userEvent.setup();
    render(<Planner />, { cache: plannerCache(), mocks: [pollingMock()] });
    await user.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "Manage plans",
      }),
    );
    const drawer = screen.getByRole("dialog", { name: "Manage plans" });
    expect(
      within(drawer).getByRole("group", { name: "Plans to manage" }),
    ).toBeVisible();
    await user.click(within(drawer).getByRole("button", { name: plan.name }));
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
      plan.name,
    );
    expect(back).not.toHaveBeenCalled();
  });

  it("should offer creation from the drawer when no plan is editable", async () => {
    const user = userEvent.setup();
    const readOnly = { ...plan, id: "shared-view-only", mine: false };
    render(<Planner />, {
      cache: plannerCache([readOnly]),
      mocks: [pollingMock(readOnly.id)],
    });
    expect(
      screen.queryByRole("button", { name: "New plan" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Manage plans" }));
    const drawer = screen.getByRole("dialog", { name: "Manage plans" });
    expect(
      within(drawer).getByRole("button", { name: `${plan.name} Read only` }),
    ).toBeDisabled();
    expect(
      within(drawer).getByRole("button", { name: "New plan" }),
    ).toBeEnabled();
  });

  it("should hide all-plan settings when there are no plans", () => {
    render(<Planner />, { cache: plannerCache([]) });
    expect(
      screen.queryByRole("button", { name: "Manage plans" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "New plan" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create a plan" })).toBeVisible();
  });

  it("should identify a shared plan with its owner's avatar instead of printed name", () => {
    const sharedPlan: Unmasked<PlannerQuery>["planner"]["plans"][number] = {
      ...plan,
      id: "family-plan",
      name: "Family dinners",
      mine: false,
      ownedBy: {
        __typename: "User",
        id: "brenna",
        name: "Brenna",
        email: "brenna@example.com",
        imageUrl: null,
      },
      owner: {
        __typename: "User",
        id: "brenna",
        name: "Brenna",
        email: "brenna@example.com",
        imageUrl: null,
      },
    };
    render(<Planner />, {
      cache: plannerCache([plan, sharedPlan]),
      mocks: [pollingMock()],
    });
    const toggle = screen.getByRole("button", {
      name: "Family dinners · Brenna",
    });
    expect(within(toggle).getByTitle("Brenna")).toHaveTextContent("B");
    expect(toggle).toHaveTextContent("Family dinners");
    expect(toggle).not.toHaveTextContent("Brenna");
    expect(
      within(
        within(planBar()).getByRole("button", { name: plan.name }),
      ).queryByTitle("Brenna"),
    ).not.toBeInTheDocument();
  });

  it.each([
    { hasPlans: false, refreshFails: false },
    { hasPlans: true, refreshFails: false },
    { hasPlans: true, refreshFails: true },
  ])(
    "should create and select a plan while preserving selections (from drawer: $hasPlans, retry refresh: $refreshFails)",
    async ({ hasPlans, refreshFails }) => {
      const user = userEvent.setup();
      const cache = plannerCache(hasPlans ? [plan] : []);
      cache.writeQuery({
        query: InitializeDeviceKeyDocument,
        data: { deviceKey: "planner-device" },
      });
      const newPlan = { ...plan, id: "holiday-plan", name: "Holiday meals" };
      const createResult = vi.fn(() => ({
        data: {
          planner: {
            __typename: "PlannerMutation",
            createPlan: { __typename: "Plan", id: newPlan.id },
          },
        },
      }));
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
            result: createResult,
            maxUsageCount: 2,
          },
          ...(refreshFails
            ? [
                {
                  request: { query: PlannerDocument },
                  error: new Error("Refresh unavailable"),
                },
              ]
            : []),
          {
            request: { query: PlannerDocument },
            result: {
              data: {
                planner: {
                  __typename: "PlannerQuery",
                  plans: hasPlans ? [plan, newPlan] : [newPlan],
                },
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
      if (hasPlans) {
        await user.click(screen.getByRole("button", { name: "Manage plans" }));
        await user.click(
          within(
            screen.getByRole("dialog", { name: "Manage plans" }),
          ).getByRole("button", { name: "New plan" }),
        );
      } else {
        await user.click(screen.getByRole("button", { name: "Create a plan" }));
      }
      await user.type(
        screen.getByRole("textbox", { name: "Name" }),
        newPlan.name,
      );
      await user.click(screen.getByRole("button", { name: "Create plan" }));
      if (refreshFails) {
        expect(await screen.findByRole("alert")).toHaveTextContent(
          "Your plan was created, but the planner could not refresh.",
        );
        await user.click(screen.getByRole("button", { name: "Refresh plans" }));
      }
      if (hasPlans) {
        const settings = await screen.findByRole("dialog", {
          name: `Manage ${newPlan.name}`,
        });
        expect(
          within(settings).getByRole("textbox", { name: "Name" }),
        ).toHaveValue(newPlan.name);
        await user.click(
          within(settings).getByRole("button", { name: /close/i }),
        );
        await waitFor(() =>
          expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
        );
      }
      const bar = await screen.findByRole("group", { name: "Planner plans" });
      expect(
        await within(bar).findByRole("button", { name: newPlan.name }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.queryByRole("dialog", { name: "New plan" }),
      ).not.toBeInTheDocument();
      if (hasPlans)
        expect(
          within(bar).getByRole("button", { name: plan.name }),
        ).toHaveAttribute("aria-pressed", "true");
      expect(
        cache
          .readQuery({ query: PlannerDocument })
          ?.planner.plans.map((item) => item.id),
      ).toEqual(hasPlans ? [plan.id, newPlan.id] : [newPlan.id]);
      expect(createResult).toHaveBeenCalledOnce();
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
    expect(
      within(planBar()).getByRole("button", { name: plan.name }),
    ).toHaveAttribute("aria-pressed", "true");
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
    expect(
      within(planBar()).getByRole("button", { name: nextPlan.name }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(planBar()).queryByRole("button", { name: plan.name }),
    ).not.toBeInTheDocument();
    expect(
      within(planBar()).getByRole("button", { name: lastPlan.name }),
    ).toHaveAttribute("aria-pressed", "false");
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
