import { AccessLevel } from "@/__generated__/graphql";
import {
  buildInMemoryCache,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test";
import type { Unmasked } from "@apollo/client/masking";
import type { MockLink } from "@apollo/client/testing";
import { describe, expect, it, vi } from "vitest";
import {
  PlanManagementFragmentDoc,
  RenameManagedPlanDocument,
  RevokePlanGrantDocument,
  SetPlanGrantDocument,
  type PlanManagementFragment,
  type RevokePlanGrantMutation,
  type SetPlanGrantMutation,
} from "./__generated__/management.generated";
import {
  SearchFriendsDocument,
  type SearchFriendsQuery,
} from "./__generated__/searchFriends.generated";
import { PlanManagement } from "./index";

type Plan = Unmasked<PlanManagementFragment>;
type Grant = Plan["grants"][number];
type User = Plan["owner"];

const PLAN_ID = "weeknight-plan";

function person(id: string, name: string): User & { name: string } {
  return {
    __typename: "User",
    id,
    name,
    email: `${id}@example.com`,
    imageUrl: null,
  };
}

const BARNEY = person("barney", "Barney Boisvert");
const BRENNA = person("brenna", "Brenna Switzer");
const PAT = person("pat", "Pat Example");

function grant(user: User, level: AccessLevel, me = false): Grant {
  return {
    __typename: "AccessControlEntry",
    level,
    user: { ...user, me },
  };
}

/** A plan I (Barney) own, shared with Brenna. */
function myPlan(grants: Grant[] = [grant(BRENNA, AccessLevel.CHANGE)]): Plan {
  return {
    __typename: "Plan",
    id: PLAN_ID,
    name: "Weeknight dinners",
    color: "#325578",
    mine: true,
    owner: BARNEY,
    grants,
  };
}

/** Brenna's plan, shared with me (Barney) at the given level, and Pat. */
function brennasPlan(myLevel: AccessLevel): Plan {
  return {
    ...myPlan([grant(BARNEY, myLevel, true), grant(PAT, AccessLevel.VIEW)]),
    mine: false,
    owner: BRENNA,
  };
}

function seed(plan: Plan) {
  const cache = buildInMemoryCache();
  cache.writeFragment({
    fragment: PlanManagementFragmentDoc,
    fragmentName: "planManagement",
    data: plan,
  });
  return cache;
}

function setGrant(
  plan: Plan,
  user: User,
  level: AccessLevel,
  grants: Grant[],
): MockLink.MockedResponse {
  const data: Unmasked<SetPlanGrantMutation> = {
    planner: {
      __typename: "PlannerMutation",
      setGrant: {
        __typename: "Plan",
        id: plan.id,
        owner: plan.owner,
        grants,
      },
    },
  };
  return {
    request: {
      query: SetPlanGrantDocument,
      variables: { planId: plan.id, userId: user.id, level },
    },
    result: { data },
  };
}

function revokeGrant(
  plan: Plan,
  user: User,
  grants: Grant[],
): MockLink.MockedResponse {
  const data: Unmasked<RevokePlanGrantMutation> = {
    planner: {
      __typename: "PlannerMutation",
      revokeGrant: {
        __typename: "Plan",
        id: plan.id,
        owner: plan.owner,
        grants,
      },
    },
  };
  return {
    request: {
      query: RevokePlanGrantDocument,
      variables: { planId: plan.id, userId: user.id },
    },
    result: { data },
  };
}

function searchFriends(
  query: string,
  friends: User[],
): MockLink.MockedResponse {
  const data: Unmasked<SearchFriendsQuery> = {
    profile: {
      __typename: "ProfileQuery",
      searchFriends: {
        __typename: "FriendConnection",
        edges: friends.map((friend) => ({
          __typename: "FriendConnectionEdge",
          node: { ...friend, __typename: "Friend" },
        })),
      },
    },
  };
  return {
    request: {
      query: SearchFriendsDocument,
      variables: { search: { query, first: 10 } },
    },
    result: { data },
  };
}

function sharing() {
  return screen.getByRole("region", { name: "Sharing" });
}

function row(name: string) {
  return within(
    within(sharing()).getByRole("list", { name: "People with access" }),
  )
    .getAllByRole("listitem")
    .find((it) => within(it).queryByText(name) !== null);
}

function levelOf(name: string) {
  return screen.getByRole("button", {
    name: new RegExp(`Access for ${name}`),
  });
}

async function chooseLevel(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement,
  label: string,
) {
  await user.click(trigger);
  await user.click(await screen.findByRole("option", { name: label }));
}

describe("plan sharing", () => {
  it("lists the owner, then each person with access and their level", () => {
    render(<PlanManagement plan={myPlan()} onDeleted={vi.fn()} />, {
      cache: seed(myPlan()),
    });

    expect(row(BARNEY.name)).toHaveTextContent("Owner");
    expect(levelOf(BRENNA.name)).toHaveTextContent("Modify");
  });

  it("says when the plan isn't shared with anyone", () => {
    render(<PlanManagement plan={myPlan([])} onDeleted={vi.fn()} />, {
      cache: seed(myPlan([])),
    });

    expect(
      within(sharing()).getByText("Not shared with anyone yet."),
    ).toBeVisible();
  });

  it("saves another person's new level without asking", async () => {
    const user = userEvent.setup();
    const plan = myPlan();
    render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
      cache: seed(plan),
      mocks: [
        setGrant(plan, BRENNA, AccessLevel.VIEW, [
          grant(BRENNA, AccessLevel.VIEW),
        ]),
      ],
    });

    await chooseLevel(user, levelOf(BRENNA.name), "View");

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(levelOf(BRENNA.name)).toHaveTextContent("View"));
  });

  it("keeps the saved level and says so when a level change fails", async () => {
    const user = userEvent.setup();
    const plan = myPlan();
    render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
      cache: seed(plan),
      mocks: [
        {
          ...setGrant(plan, BRENNA, AccessLevel.VIEW, []),
          result: undefined,
          error: new Error("Server unavailable"),
        },
      ],
    });

    await chooseLevel(user, levelOf(BRENNA.name), "View");

    expect(await within(sharing()).findByRole("alert")).toHaveTextContent(
      `Couldn’t change ${BRENNA.name}’s access. Try again.`,
    );
    expect(levelOf(BRENNA.name)).toHaveTextContent("Modify");
  });

  it("asks before changing my own level, and sends nothing on cancel", async () => {
    const user = userEvent.setup();
    const plan = brennasPlan(AccessLevel.ADMINISTER);
    const onDeleted = vi.fn();
    render(<PlanManagement plan={plan} onDeleted={onDeleted} />, {
      cache: seed(plan),
    });

    await chooseLevel(user, levelOf(BARNEY.name), "Modify");
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(levelOf(BARNEY.name)).toHaveTextContent("Administer");
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("returns to the plan list after I confirm my own new level", async () => {
    const user = userEvent.setup();
    const plan = brennasPlan(AccessLevel.ADMINISTER);
    const cache = seed(plan);
    const onDeleted = vi.fn();
    render(<PlanManagement plan={plan} onDeleted={onDeleted} />, {
      cache,
      mocks: [
        setGrant(plan, BARNEY, AccessLevel.CHANGE, [
          grant(BARNEY, AccessLevel.CHANGE, true),
          grant(PAT, AccessLevel.VIEW),
        ]),
      ],
    });

    await chooseLevel(user, levelOf(BARNEY.name), "Modify");
    const dialog = await screen.findByRole("alertdialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Change my access" }),
    );

    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(cache.identify(plan)).toBeDefined();
    expect(
      cache.readFragment({
        fragment: PlanManagementFragmentDoc,
        fragmentName: "planManagement",
        id: cache.identify(plan),
      })?.grants[0].level,
    ).toBe(AccessLevel.CHANGE);
  });

  it("asks before removing someone, then removes them", async () => {
    const user = userEvent.setup();
    const plan = myPlan();
    render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
      cache: seed(plan),
      mocks: [revokeGrant(plan, BRENNA, [])],
    });

    await user.click(
      within(sharing()).getByRole("button", {
        name: `Remove ${BRENNA.name}`,
      }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/assignments .* will be cleared/);
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );

    expect(
      within(sharing()).getByText("Not shared with anyone yet."),
    ).toBeVisible();
  });

  it("keeps the confirmation open when removing someone fails", async () => {
    const user = userEvent.setup();
    const plan = myPlan();
    render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
      cache: seed(plan),
      mocks: [
        {
          ...revokeGrant(plan, BRENNA, []),
          result: undefined,
          error: new Error("Server unavailable"),
        },
      ],
    });

    await user.click(
      within(sharing()).getByRole("button", {
        name: `Remove ${BRENNA.name}`,
      }),
    );
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(await within(dialog).findByRole("alert")).toBeVisible();
    expect(dialog).toBeInTheDocument();
  });

  it("forgets the plan and returns to the plan list after I remove myself", async () => {
    const user = userEvent.setup();
    const plan = brennasPlan(AccessLevel.ADMINISTER);
    const cache = seed(plan);
    const onDeleted = vi.fn();
    render(<PlanManagement plan={plan} onDeleted={onDeleted} />, {
      cache,
      mocks: [revokeGrant(plan, BARNEY, [grant(PAT, AccessLevel.VIEW)])],
    });

    await user.click(
      within(sharing()).getByRole("button", {
        name: `Remove ${BARNEY.name}`,
      }),
    );
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(cache.extract()[cache.identify(plan)!]).toBeUndefined();
  });

  it("suggests friends after two characters, leaving out the owner and those with access", async () => {
    const user = userEvent.setup();
    const plan = brennasPlan(AccessLevel.ADMINISTER);
    const CASEY = person("casey", "Casey Palmer");
    render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
      cache: seed(plan),
      mocks: [searchFriends("Pa", [CASEY, PAT, BRENNA])],
    });
    const search = within(sharing()).getByRole("combobox", {
      name: "Add person",
    });

    await user.type(search, "P");
    expect(
      await screen.findByText("Type at least two letters of a name or email."),
    ).toBeVisible();
    await user.type(search, "a");

    await screen.findByRole("option", { name: new RegExp(CASEY.name) });
    expect(screen.getAllByRole("option").map((it) => it.textContent)).toEqual([
      expect.stringContaining(CASEY.name),
    ]);
  });

  it("adds the chosen friend at Modify unless another level is chosen", async () => {
    const user = userEvent.setup();
    const plan = myPlan([]);
    render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
      cache: seed(plan),
      mocks: [
        searchFriends("Pa", [PAT]),
        setGrant(plan, PAT, AccessLevel.CHANGE, [
          grant(PAT, AccessLevel.CHANGE),
        ]),
      ],
    });
    const add = within(sharing()).getByRole("button", { name: "Add" });
    expect(add).toBeDisabled();
    expect(
      within(sharing()).getByRole("button", { name: /Access for new person/ }),
    ).toHaveTextContent("Modify");

    await user.type(
      within(sharing()).getByRole("combobox", { name: "Add person" }),
      "Pa",
    );
    await user.click(await screen.findByRole("option", { name: /Pat/ }));
    await user.click(add);

    expect(
      await screen.findByRole("button", { name: /Access for Pat/ }),
    ).toHaveTextContent("Modify");
    expect(
      within(sharing()).getByRole("combobox", { name: "Add person" }),
    ).toHaveValue("");
    expect(add).toBeDisabled();
  });

  it("shows sharing read-only to people who can modify but not administer", () => {
    const plan = brennasPlan(AccessLevel.CHANGE);
    render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
      cache: seed(plan),
    });

    expect(row(PAT.name)).toHaveTextContent("View");
    expect(
      within(sharing()).queryByRole("button", { name: /Access for/ }),
    ).not.toBeInTheDocument();
    expect(
      within(sharing()).queryByRole("button", { name: /Remove/ }),
    ).not.toBeInTheDocument();
    expect(
      within(sharing()).queryByRole("combobox", { name: "Add person" }),
    ).not.toBeInTheDocument();
  });

  it("stays usable while the plan's details save", async () => {
    const user = userEvent.setup();
    const plan = myPlan();
    render(<PlanManagement plan={plan} onDeleted={vi.fn()} />, {
      cache: seed(plan),
      mocks: [
        {
          request: {
            query: RenameManagedPlanDocument,
            variables: { id: plan.id, name: "Family dinners" },
          },
          // Never answers, so the save stays under way.
          delay: Infinity,
          result: { data: null },
        },
      ],
    });
    const name = screen.getByRole("textbox", { name: "Name" });
    await user.clear(name);
    await user.type(name, "Family dinners");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("form", { name: "Plan details" })).toHaveAttribute(
      "aria-busy",
      "true",
    );

    expect(
      within(sharing()).getByRole("button", { name: `Remove ${BRENNA.name}` }),
    ).toBeEnabled();
    expect(levelOf(BRENNA.name)).toBeEnabled();
    expect(
      within(sharing()).getByRole("combobox", { name: "Add person" }),
    ).toBeEnabled();
  });
});
