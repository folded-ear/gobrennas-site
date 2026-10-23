import { pollQuery } from "@/features/page-engine/mutation";
import { DeleteManagedPlanDocument } from "@/features/plan-management/__generated__/management.generated";
import { PreferenceValueFragmentDoc } from "@/hooks/use-preference/__generated__/preferenceValue.generated";
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

function plannerCache() {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: PlannerDocument,
    data: { planner: { __typename: "PlannerQuery", plans: [plan] } },
  });
  cache.writeFragment({
    id: cache.identify({
      __typename: "UserPreference",
      name: PREF_PLANNER_PLANS,
    }),
    fragment: PreferenceValueFragmentDoc,
    data: { __typename: "UserPreference", value: formatIdSet([plan.id]) },
  });
  return cache;
}

function pollingMock() {
  return {
    request: pollQuery([{ planId: plan.id, cutoff: -7500 }]),
    result: { data: { planner: { __typename: "PlannerQuery", p0: [] } } },
  };
}

describe("planner management drawer", () => {
  it("should open management in the shared drawer and close through history", async () => {
    const user = userEvent.setup();
    render(<Planner />, { cache: plannerCache(), mocks: [pollingMock()] });
    await user.click(screen.getByRole("button", { name: "Manage plans" }));
    await user.click(screen.getByRole("menuitem", { name: plan.name }));
    const drawer = screen.getByRole("dialog", { name: `Manage ${plan.name}` });
    expect(within(drawer).getByRole("textbox", { name: "Name" })).toHaveValue(
      plan.name,
    );
    await user.click(within(drawer).getByRole("button", { name: /close/i }));
    expect(back).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: "Planner", level: 1 }),
    ).toBeInTheDocument();
  });

  it("should return to the empty planner after deleting the last plan", async () => {
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
    await user.click(screen.getByRole("button", { name: "Manage plans" }));
    await user.click(screen.getByRole("menuitem", { name: plan.name }));
    await user.click(screen.getByRole("button", { name: "Delete plan" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Delete plan",
      }),
    );
    expect(
      await screen.findByText("There are no plans to show."),
    ).toBeInTheDocument();
    expect(back).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Manage plans" }),
    ).not.toBeInTheDocument();
  });
});
