import { PlanItemStatus } from "@/__generated__/graphql";
import { PlanItemFragmentDoc } from "@/features/plan-item/__generated__/planItem.generated";
import { PlanPickerPlanFragmentDoc } from "@/features/plan-picker/__generated__/planPickerPlan.generated";
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
import { buildPlanTree, treeMove, TreeSource } from "./moves";
import { usePlanMoves } from "./use-plan-moves";

// Plan 7 (Thanksgiving), with bucket b1 on Sep 12 and Lunch undated:
//   Thanksgiving dinner (1), in b1
//     Pumpkin pie (2)
//     Roast turkey (5)
//   Breakfast (6)
// Plan 9 (Weeknights), with no buckets:
//   Tacos (20)
const PLAN_ID = "7";
const WEEKNIGHTS_ID = "9";
const PLAN_IDS: ReadonlySet<string> = new Set([PLAN_ID, WEEKNIGHTS_ID]);
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
    parent: PLAN_IDS.has(parentId)
      ? { __typename: "Plan", id: parentId }
      : { __typename: "PlanItem", id: parentId },
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
    buckets: [
      { __typename: "PlanBucket", id: "b1", date: SEP_12, name: null },
      { __typename: "PlanBucket", id: "bLunch", date: null, name: "Lunch" },
    ],
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

function weeknights(): Plan {
  return {
    __typename: "Plan",
    id: WEEKNIGHTS_ID,
    name: "Weeknights",
    color: "#1E88E5",
    mine: true,
    grants: [],
    ownedBy: null,
    notes: null,
    buckets: [],
    children: [{ __typename: "PlanItem", id: "20" }],
    descendants: [item("20", "Tacos", WEEKNIGHTS_ID)],
  };
}

/** I give every plan and item as one list, the way a tree is built. */
function treeSources(
  plans: readonly (TreeSource & { descendants: readonly TreeSource[] })[],
): readonly TreeSource[] {
  return plans.flatMap((plan) => [plan, ...plan.descendants]);
}

/**
 * I read the planner the way the app does, show what a user would learn
 * from it, and offer the moves under test as buttons.
 */
function Probe() {
  const { data } = useQuery(PlannerDocument, { fetchPolicy: "cache-only" });
  const plans = data?.planner.plans ?? [];
  const plan = plans[0];
  const tree = buildPlanTree(treeSources(plans));
  const moves = usePlanMoves({ plans, tree });
  if (!plan) return null;

  const nameOf = (id: string) =>
    [plan, ...plan.descendants].find((it) => it.id === id)?.name ?? id;
  const dateOf = (bucketId: string | undefined) =>
    plan.buckets.find((b) => b.id === bucketId)?.date ?? "no date";
  const breakfast = plan.descendants.find((it) => it.id === "6");
  const breakfastBucket = breakfast?.bucket?.id ?? "unplanned";
  const tacos = plans[1]?.descendants.find((it) => it.id === "20");
  const tacosBucket = plans[1]?.buckets.find((b) => b.id === tacos?.bucket?.id);

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
      <p>Breakfast&apos;s bucket is {breakfastBucket}</p>
      <p>
        Tacos&apos; bucket is{" "}
        {tacosBucket
          ? `${tacosBucket.id} (${tacosBucket.name ?? "unnamed"} on ${tacosBucket.date ?? "no date"})`
          : "unplanned"}
      </p>
      <p>
        Moving:{" "}
        {["5", "6"].filter((id) => moves.isMoving(id)).join(", ") || "nothing"}
      </p>
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
      <button
        type="button"
        onClick={() => {
          const move = treeMove(tree, "6", "1", "before");
          if (move) moves.moveInTree(move, "Breakfast");
        }}
      >
        Put breakfast first
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
      <button
        type="button"
        disabled={moves.isMoving("6")}
        onClick={() =>
          moves.moveToBucket("6", { name: "Lunch", date: null }, "Breakfast")
        }
      >
        Put breakfast in Lunch
      </button>
      <button
        type="button"
        onClick={() =>
          moves.moveToBucket("20", { name: "Lunch", date: null }, "Tacos")
        }
      >
        Put tacos in Lunch
      </button>
      <button
        type="button"
        onClick={() => moves.moveToDate("20", SEP_12, "Tacos")}
      >
        Put tacos on {SEP_12}
      </button>
      <button
        type="button"
        disabled={moves.isMoving("6")}
        onClick={() => moves.moveToUnplanned("6", "Breakfast")}
      >
        Unplan breakfast
      </button>
    </>
  );
}

function renderProbe(mocks: MockLink.MockedResponse[]) {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: PlannerDocument,
    data: {
      planner: {
        __typename: "PlannerQuery",
        plans: [thanksgiving(), weeknights()],
      },
    },
  });
  render(<Probe />, { cache, mocks });
  return cache;
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
        children: [{ __typename: "PlanItem", id: "5" }],
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
  variables: { planId: PLAN_ID, date: SEP_14, name: null },
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
    const cache = renderProbe([
      { request: NEST_TURKEY, result: NESTED_TURKEY },
    ]);

    await userEvent.click(screen.getByRole("button", { name: /Nest turkey/ }));

    await waitFor(() =>
      expect(screen.getByText(/^Moving:/)).toHaveTextContent("nothing"),
    );
    expect(childrenOf("Breakfast")).toHaveTextContent("Roast turkey");
    expect(childrenOf("Thanksgiving dinner")).toHaveTextContent(
      /^Thanksgiving dinner: Pumpkin pie$/,
    );
    expect(
      cache.readFragment({
        fragment: PlanItemFragmentDoc,
        fragmentName: "planItem",
        id: "PlanItem:5",
      })?.parent.id,
    ).toBe("6");
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

const BREAKFAST_FIRST = {
  query: DoMutateTreeDocument,
  variables: { spec: { ids: ["6"], parentId: PLAN_ID, afterId: null } },
};

const PUT_BREAKFAST_FIRST = {
  data: {
    planner: {
      __typename: "PlannerMutation",
      mutateTree: {
        __typename: "PlanItem",
        children: ["6", "1"].map((id) => ({ __typename: "PlanItem", id })),
      },
    },
  },
};

describe("usePlanMoves, among the plan's own items", () => {
  // The plan picker reads the plan through a fragment on Plan, which stops
  // matching, silently, if the plan's cache entry is retyped.
  function pickerName(cache: ReturnType<typeof buildInMemoryCache>) {
    return cache.readFragment(
      { fragment: PlanPickerPlanFragmentDoc, id: `PlanItem:${PLAN_ID}` },
      true,
    )?.name;
  }

  it("keeps the plan a plan while the server is asked", async () => {
    const cache = renderProbe([
      { request: BREAKFAST_FIRST, result: PUT_BREAKFAST_FIRST, delay: 60_000 },
    ]);

    await userEvent.click(screen.getByRole("button", { name: /first/ }));

    expect(childrenOf("Thanksgiving")).toHaveTextContent(
      /^Thanksgiving: Breakfast, Thanksgiving dinner$/,
    );
    expect(pickerName(cache)).toBe("Thanksgiving");
  });

  it("keeps the plan a plan once the server answers", async () => {
    const cache = renderProbe([
      { request: BREAKFAST_FIRST, result: PUT_BREAKFAST_FIRST },
    ]);

    await userEvent.click(screen.getByRole("button", { name: /first/ }));

    await waitFor(() =>
      expect(screen.getByText(/^Moving:/)).toHaveTextContent("nothing"),
    );
    expect(childrenOf("Thanksgiving")).toHaveTextContent(
      /^Thanksgiving: Breakfast, Thanksgiving dinner$/,
    );
    expect(pickerName(cache)).toBe("Thanksgiving");
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

const ASSIGN_LUNCH = {
  query: DoAssignBucketDocument,
  variables: { id: "6", bucketId: "bLunch" },
};

describe("usePlanMoves, onto a named bucket", () => {
  it("joins the bucket directly, without creating one", async () => {
    renderProbe([{ request: ASSIGN_LUNCH, result: assigned("bLunch") }]);

    await userEvent.click(
      screen.getByRole("button", { name: "Put breakfast in Lunch" }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Breakfast's bucket is/)).toHaveTextContent(
        "bLunch",
      ),
    );
  });

  it("shows the item in the bucket before the server answers", async () => {
    renderProbe([
      { request: ASSIGN_LUNCH, result: assigned("bLunch"), delay: 60_000 },
    ]);

    await userEvent.click(
      screen.getByRole("button", { name: "Put breakfast in Lunch" }),
    );

    expect(screen.getByText(/Breakfast's bucket is/)).toHaveTextContent(
      "bLunch",
    );
  });

  it("puts the item back and says so when it can't join the bucket", async () => {
    renderProbe([{ request: ASSIGN_LUNCH, error: new Error("Forbidden") }]);

    await userEvent.click(
      screen.getByRole("button", { name: "Put breakfast in Lunch" }),
    );

    expect(await screen.findByText("Couldn't move Breakfast")).toBeVisible();
    expect(screen.getByText(/Breakfast's bucket is/)).toHaveTextContent(
      "unplanned",
    );
  });
});

const UNASSIGN_BREAKFAST = {
  query: DoAssignBucketDocument,
  variables: { id: "6", bucketId: null },
};

function unassigned() {
  return {
    data: {
      planner: {
        __typename: "PlannerMutation",
        assignBucket: {
          __typename: "PlanItem",
          id: "6",
          bucket: null,
        },
      },
    },
  };
}

function createdBucket(id: string, date: string | null, name: string | null) {
  return {
    data: {
      planner: {
        __typename: "PlannerMutation",
        createBucket: { __typename: "PlanBucket", id, date, name },
      },
    },
  };
}

function assignedTacos(bucketId: string) {
  return {
    data: {
      planner: {
        __typename: "PlannerMutation",
        assignBucket: {
          __typename: "PlanItem",
          id: "20",
          bucket: { __typename: "PlanBucket", id: bucketId },
        },
      },
    },
  };
}

describe("usePlanMoves, across plans", () => {
  it("creates a named bucket in the item's own plan, not joining another's", async () => {
    renderProbe([
      {
        request: {
          query: DoCreateBucketDocument,
          variables: { planId: WEEKNIGHTS_ID, date: null, name: "Lunch" },
        },
        result: createdBucket("wLunch", null, "Lunch"),
      },
      {
        request: {
          query: DoAssignBucketDocument,
          variables: { id: "20", bucketId: "wLunch" },
        },
        result: assignedTacos("wLunch"),
      },
    ]);

    await userEvent.click(
      screen.getByRole("button", { name: "Put tacos in Lunch" }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Tacos' bucket is/)).toHaveTextContent(
        "wLunch (Lunch on no date)",
      ),
    );
  });

  it("creates a date's bucket in the item's own plan, not joining another's", async () => {
    renderProbe([
      {
        request: {
          query: DoCreateBucketDocument,
          variables: { planId: WEEKNIGHTS_ID, date: SEP_12, name: null },
        },
        result: createdBucket("wSep12", SEP_12, null),
      },
      {
        request: {
          query: DoAssignBucketDocument,
          variables: { id: "20", bucketId: "wSep12" },
        },
        result: assignedTacos("wSep12"),
      },
    ]);

    await userEvent.click(
      screen.getByRole("button", { name: `Put tacos on ${SEP_12}` }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Tacos' bucket is/)).toHaveTextContent(
        `wSep12 (unnamed on ${SEP_12})`,
      ),
    );
  });

  it("shows the item in its new named bucket while the bucket is made", async () => {
    renderProbe([
      {
        request: {
          query: DoCreateBucketDocument,
          variables: { planId: WEEKNIGHTS_ID, date: null, name: "Lunch" },
        },
        result: createdBucket("wLunch", null, "Lunch"),
        delay: 60_000,
      },
    ]);

    await userEvent.click(
      screen.getByRole("button", { name: "Put tacos in Lunch" }),
    );

    expect(screen.getByText(/Tacos' bucket is/)).toHaveTextContent(
      "(Lunch on no date)",
    );
  });
});

describe("usePlanMoves, onto unplanned", () => {
  it("clears the item's bucket", async () => {
    renderProbe([{ request: UNASSIGN_BREAKFAST, result: unassigned() }]);

    await userEvent.click(
      screen.getByRole("button", { name: "Unplan breakfast" }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Breakfast's bucket is/)).toHaveTextContent(
        "unplanned",
      ),
    );
  });

  it("puts the item back and says so when it can't be cleared", async () => {
    renderProbe([
      { request: UNASSIGN_BREAKFAST, error: new Error("Forbidden") },
    ]);

    await userEvent.click(
      screen.getByRole("button", { name: "Unplan breakfast" }),
    );

    expect(await screen.findByText("Couldn't move Breakfast")).toBeVisible();
  });
});

// Plan 20 (Redundancy), with bA on Sep 12 and bB on Sep 14:
//   Ancestor (10), bA
//     Middle (11), bC
//   Solo (13)
//     Solo child (14), bB
const REDUNDANCY_PLAN_ID = "20";
const BUCKET_A = "bA";
const BUCKET_B = "bB";
const BUCKET_C = "bC";

function redundancyPlan(): Plan {
  return {
    __typename: "Plan",
    id: REDUNDANCY_PLAN_ID,
    name: "Redundancy",
    color: "#000000",
    mine: true,
    grants: [],
    ownedBy: null,
    notes: null,
    buckets: [
      { __typename: "PlanBucket", id: BUCKET_A, date: SEP_12, name: null },
      { __typename: "PlanBucket", id: BUCKET_B, date: SEP_14, name: null },
      { __typename: "PlanBucket", id: BUCKET_C, date: null, name: "Other" },
    ],
    children: [
      { __typename: "PlanItem", id: "10" },
      { __typename: "PlanItem", id: "13" },
    ],
    descendants: [
      item("10", "Ancestor", REDUNDANCY_PLAN_ID, ["11"], BUCKET_A),
      item("11", "Middle", "10", [], BUCKET_C),
      item("13", "Solo", REDUNDANCY_PLAN_ID, ["14"]),
      item("14", "Solo child", "13", [], BUCKET_B),
    ],
  };
}

function RedundancyProbe() {
  const { data } = useQuery(PlannerDocument, { fetchPolicy: "cache-only" });
  const plans = data?.planner.plans ?? [];
  const plan = plans[0];
  const tree = buildPlanTree(treeSources(plans));
  const moves = usePlanMoves({ plans, tree });
  if (!plan) return null;

  const bucketOf = (id: string) =>
    plan.descendants.find((it) => it.id === id)?.bucket?.id ?? "unplanned";

  return (
    <>
      <p>Middle&apos;s bucket is {bucketOf("11")}</p>
      <p>Solo child&apos;s bucket is {bucketOf("14")}</p>
      <button
        type="button"
        onClick={() => moves.moveToDate("11", SEP_12, "Middle")}
      >
        Put middle in bucket A
      </button>
      <button
        type="button"
        onClick={() => moves.moveToDate("13", SEP_14, "Solo")}
      >
        Put solo in bucket B
      </button>
    </>
  );
}

function renderRedundancyProbe(mocks: MockLink.MockedResponse[]) {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: PlannerDocument,
    data: {
      planner: { __typename: "PlannerQuery", plans: [redundancyPlan()] },
    },
  });
  render(<RedundancyProbe />, { cache, mocks });
}

function assignedItem(id: string, bucketId: string | null) {
  return {
    data: {
      planner: {
        __typename: "PlannerMutation",
        assignBucket: {
          __typename: "PlanItem",
          id,
          bucket:
            bucketId === null
              ? null
              : { __typename: "PlanBucket", id: bucketId },
        },
      },
    },
  };
}

describe("usePlanMoves, folding away redundant buckets", () => {
  it("clears a descendant's bucket once it would inherit the very same one", async () => {
    renderRedundancyProbe([
      {
        request: {
          query: DoAssignBucketDocument,
          variables: { id: "13", bucketId: BUCKET_B },
        },
        result: assignedItem("13", BUCKET_B),
      },
      {
        request: {
          query: DoAssignBucketDocument,
          variables: { id: "14", bucketId: null },
        },
        result: assignedItem("14", null),
      },
    ]);

    await userEvent.click(
      screen.getByRole("button", { name: "Put solo in bucket B" }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Solo child's bucket is/)).toHaveTextContent(
        "unplanned",
      ),
    );
  });

  it("leaves a descendant's bucket alone when the dropped item can't move", async () => {
    renderRedundancyProbe([
      {
        request: {
          query: DoAssignBucketDocument,
          variables: { id: "13", bucketId: BUCKET_B },
        },
        error: new Error("Forbidden"),
        delay: RESPONSE_DELAY_MS,
      },
      {
        request: {
          query: DoAssignBucketDocument,
          variables: { id: "14", bucketId: null },
        },
        result: assignedItem("14", null),
      },
    ]);

    await userEvent.click(
      screen.getByRole("button", { name: "Put solo in bucket B" }),
    );

    expect(await screen.findByText("Couldn't move Solo")).toBeVisible();
    expect(screen.getByText(/Solo child's bucket is/)).toHaveTextContent(
      BUCKET_B,
    );
  });

  it("clears the dropped item's own bucket when an ancestor already carries it", async () => {
    renderRedundancyProbe([
      {
        request: {
          query: DoAssignBucketDocument,
          variables: { id: "11", bucketId: null },
        },
        result: assignedItem("11", null),
      },
    ]);

    await userEvent.click(
      screen.getByRole("button", { name: "Put middle in bucket A" }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Middle's bucket is/)).toHaveTextContent(
        "unplanned",
      ),
    );
  });
});
