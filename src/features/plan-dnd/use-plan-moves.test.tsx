import { PlanItemStatus } from "@/__generated__/graphql";
import {
  PlannerDocument,
  PlannerQuery,
} from "@/screens/__generated__/planner.generated";
import {
  buildInMemoryCache,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test";
import { Unmasked } from "@apollo/client/masking";
import { useQuery } from "@apollo/client/react";
import { MockLink } from "@apollo/client/testing";
import { describe, expect, it } from "vitest";
import { DoAssignBucketDocument } from "./__generated__/doAssignBucket.generated";
import { DoCreateBucketDocument } from "./__generated__/doCreateBucket.generated";
import { DoMutateTreeDocument } from "./__generated__/doMutateTree.generated";
import { buildPlanTree, treeMove } from "./moves";
import { usePlanMoves } from "./use-plan-moves";

// Plan 7 (Thanksgiving), with bucket b1 on Sep 12:
//   Thanksgiving dinner (1), in b1
//     Pumpkin pie (2)
//     Roast turkey (5)
//   Breakfast (6)
const PLAN_ID = "7";
const SEP_12 = "2026-09-12";
const SEP_14 = "2026-09-14";
const RESPONSE_DELAY_MS = 100;

type Plan = Unmasked<PlannerQuery>["planner"]["plans"][number];
type Item = Plan["descendants"][number];

function item(
  id: string,
  name: string,
  parentId: string,
  childIds: readonly string[] = [],
  bucketId: string | null = null,
): Item {
  return {
    __typename: "PlanItem",
    id,
    name,
    status: PlanItemStatus.NEEDED,
    notes: null,
    preparation: null,
    parent: { __typename: "PlanItem", id: parentId },
    aggregate: null,
    ingredient: null,
    quantity: null,
    components: [],
    bucket: bucketId ? { __typename: "PlanBucket", id: bucketId } : null,
    children: childIds.map((c) => ({ __typename: "PlanItem", id: c })),
  };
}

function thanksgiving(): Plan {
  return {
    __typename: "Plan",
    id: PLAN_ID,
    name: "Thanksgiving",
    color: "#F57F17",
    mine: true,
    grants: [],
    ownedBy: null,
    notes: null,
    buckets: [{ __typename: "PlanBucket", id: "b1", date: SEP_12, name: null }],
    children: [
      { __typename: "PlanItem", id: "1" },
      { __typename: "PlanItem", id: "6" },
    ],
    descendants: [
      item("1", "Thanksgiving dinner", PLAN_ID, ["2", "5"], "b1"),
      item("2", "Pumpkin pie", "1"),
      item("5", "Roast turkey", "1"),
      item("6", "Breakfast", PLAN_ID),
    ],
  };
}

/**
 * I read the planner the way the app does, show what a user would learn
 * from it, and offer the moves under test as buttons.
 */
function Probe() {
  const { data } = useQuery(PlannerDocument, { fetchPolicy: "cache-only" });
  const plan = data?.planner.plans[0];
  const tree = plan ? buildPlanTree(plan, plan.descendants) : null;
  const moves = usePlanMoves({
    planId: PLAN_ID,
    tree: tree ?? buildPlanTree({ id: PLAN_ID, children: [] }, []),
    buckets: plan?.buckets ?? [],
  });
  if (!plan || !tree) return null;

  const nameOf = (id: string) =>
    [plan, ...plan.descendants].find((it) => it.id === id)?.name ?? id;
  const dateOf = (bucketId: string | undefined) =>
    plan.buckets.find((b) => b.id === bucketId)?.date ?? "no date";
  const breakfast = plan.descendants.find((it) => it.id === "6");

  return (
    <>
      <ul aria-label="Children">
        {[plan, ...plan.descendants].map((it) => (
          <li key={it.id}>
            {it.name}: {it.children.map((c) => nameOf(c.id)).join(", ")}
          </li>
        ))}
      </ul>
      <p>Breakfast is on {dateOf(breakfast?.bucket?.id)}</p>
      <p>Dated buckets: {plan.buckets.filter((b) => b.date).length}</p>
      <button
        type="button"
        onClick={() => {
          const move = treeMove(tree, "5", "6", "child");
          if (move) moves.moveInTree(move, "Roast turkey");
        }}
      >
        Nest turkey under breakfast
      </button>
      {[SEP_12, SEP_14].map((date) => (
        <button
          key={date}
          type="button"
          disabled={moves.isMoving("6")}
          onClick={() => moves.moveToDate("6", date, "Breakfast")}
        >
          Put breakfast on {date}
        </button>
      ))}
    </>
  );
}

function renderProbe(mocks: MockLink.MockedResponse[]) {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: PlannerDocument,
    data: { planner: { __typename: "PlannerQuery", plans: [thanksgiving()] } },
  });
  return render(<Probe />, { cache, mocks });
}

function childrenOf(name: string) {
  const list = screen.getByRole("list", { name: "Children" });
  return within(list).getByText(new RegExp(`^${name}:`));
}

const NEST_TURKEY = {
  query: DoMutateTreeDocument,
  variables: { spec: { ids: ["5"], parentId: "6", afterId: null } },
};

const NESTED_TURKEY = {
  data: {
    planner: {
      __typename: "PlannerMutation",
      mutateTree: {
        __typename: "PlanItem",
        children: [
          {
            __typename: "PlanItem",
            id: "5",
            parent: { __typename: "PlanItem", id: "6" },
          },
        ],
      },
    },
  },
};

function assigned(bucketId: string) {
  return {
    data: {
      planner: {
        __typename: "PlannerMutation",
        assignBucket: {
          __typename: "PlanItem",
          id: "6",
          bucket: { __typename: "PlanBucket", id: bucketId },
        },
      },
    },
  };
}

const CREATE_SEP_14 = {
  query: DoCreateBucketDocument,
  variables: { planId: PLAN_ID, date: SEP_14 },
};

const CREATED_B9 = {
  data: {
    planner: {
      __typename: "PlannerMutation",
      createBucket: {
        __typename: "PlanBucket",
        id: "b9",
        date: SEP_14,
        name: null,
      },
    },
  },
};

const ASSIGN_B9 = {
  query: DoAssignBucketDocument,
  variables: { id: "6", bucketId: "b9" },
};

describe("usePlanMoves, in the tree", () => {
  it("moves an item from its old parent to its new one", async () => {
    renderProbe([{ request: NEST_TURKEY, result: NESTED_TURKEY }]);

    await userEvent.click(screen.getByRole("button", { name: /Nest turkey/ }));

    await waitFor(() =>
      expect(childrenOf("Breakfast")).toHaveTextContent("Roast turkey"),
    );
    expect(childrenOf("Thanksgiving dinner")).toHaveTextContent(
      /^Thanksgiving dinner: Pumpkin pie$/,
    );
  });

  it("moves the item before the server answers", async () => {
    renderProbe([
      { request: NEST_TURKEY, result: NESTED_TURKEY, delay: 60_000 },
    ]);

    await userEvent.click(screen.getByRole("button", { name: /Nest turkey/ }));

    expect(childrenOf("Breakfast")).toHaveTextContent("Roast turkey");
    expect(childrenOf("Thanksgiving dinner")).not.toHaveTextContent(
      "Roast turkey",
    );
  });

  it("puts the item back and says so when the move fails", async () => {
    renderProbe([{ request: NEST_TURKEY, error: new Error("Forbidden") }]);

    await userEvent.click(screen.getByRole("button", { name: /Nest turkey/ }));

    expect(await screen.findByText("Couldn't move Roast turkey")).toBeVisible();
    expect(childrenOf("Thanksgiving dinner")).toHaveTextContent(
      "Pumpkin pie, Roast turkey",
    );
    expect(childrenOf("Breakfast")).toHaveTextContent(/^Breakfast:$/);
  });
});

describe("usePlanMoves, onto a date", () => {
  it("joins the bucket already on that date", async () => {
    renderProbe([
      {
        request: {
          query: DoAssignBucketDocument,
          variables: { id: "6", bucketId: "b1" },
        },
        result: assigned("b1"),
      },
    ]);

    await userEvent.click(
      screen.getByRole("button", { name: `Put breakfast on ${SEP_12}` }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Breakfast is on/)).toHaveTextContent(SEP_12),
    );
    expect(screen.getByText(/Dated buckets/)).toHaveTextContent("1");
  });

  it("creates a bucket for a date that has none, then joins it", async () => {
    renderProbe([
      { request: CREATE_SEP_14, result: CREATED_B9 },
      { request: ASSIGN_B9, result: assigned("b9") },
    ]);

    await userEvent.click(
      screen.getByRole("button", { name: `Put breakfast on ${SEP_14}` }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: `Put breakfast on ${SEP_14}` }),
      ).toBeEnabled(),
    );
    expect(screen.getByText(/Breakfast is on/)).toHaveTextContent(SEP_14);
    expect(screen.getByText(/Dated buckets/)).toHaveTextContent("2");
  });

  it("shows the item on its new date at every step of creating a bucket", async () => {
    let assignSent = false;
    renderProbe([
      { request: CREATE_SEP_14, result: CREATED_B9, delay: RESPONSE_DELAY_MS },
      {
        request: ASSIGN_B9,
        result: assigned("b9"),
        // Asked when the request arrives, so it marks the assignment as
        // sent while its answer is still a long way off.
        delay: () => {
          assignSent = true;
          return RESPONSE_DELAY_MS * 5;
        },
      },
    ]);
    const onSep14 = () =>
      expect(screen.getByText(/Breakfast is on/)).toHaveTextContent(SEP_14);
    const button = () =>
      screen.getByRole("button", { name: `Put breakfast on ${SEP_14}` });

    await userEvent.click(button());
    onSep14();
    expect(button()).toBeDisabled();

    // The assignment only goes out once the bucket exists.
    await waitFor(() => expect(assignSent).toBe(true));
    onSep14();
    expect(button()).toBeDisabled();

    await waitFor(() => expect(button()).toBeEnabled());
    onSep14();
  });

  it("puts the item back and says so when the bucket can't be made", async () => {
    renderProbe([{ request: CREATE_SEP_14, error: new Error("Forbidden") }]);

    await userEvent.click(
      screen.getByRole("button", { name: `Put breakfast on ${SEP_14}` }),
    );

    expect(await screen.findByText("Couldn't move Breakfast")).toBeVisible();
    expect(screen.getByText(/Breakfast is on/)).toHaveTextContent("no date");
    expect(screen.getByText(/Dated buckets/)).toHaveTextContent("1");
  });

  it("puts the item back and says so when it can't join the new bucket", async () => {
    renderProbe([
      { request: CREATE_SEP_14, result: CREATED_B9 },
      { request: ASSIGN_B9, error: new Error("Forbidden") },
    ]);

    await userEvent.click(
      screen.getByRole("button", { name: `Put breakfast on ${SEP_14}` }),
    );

    expect(await screen.findByText("Couldn't move Breakfast")).toBeVisible();
    expect(screen.getByText(/Breakfast is on/)).toHaveTextContent("no date");
  });
});
