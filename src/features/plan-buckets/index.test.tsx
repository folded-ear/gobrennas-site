import { AccessLevel } from "@/__generated__/graphql";
import { render, screen, userEvent, waitFor } from "@/test";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  CreateNamedBucketDocument,
  RemoveNamedBucketDocument,
  UpdateNamedBucketDocument,
} from "./__generated__/buckets.generated";
import { BucketDialog, BucketMenu } from "./index";
import { type Bucket, type BucketAction, type BucketPlan } from "./model";

const bucket: Bucket & { __typename: "PlanBucket" } = {
  __typename: "PlanBucket" as const,
  id: "b",
  name: "Columbus Day",
  date: "2026-10-12",
};
const plan: BucketPlan = {
  __typename: "Plan",
  id: "p",
  name: "Week",
  color: "#c37ebd",
  mine: true,
  grants: [],
  buckets: [bucket],
};
const query = gql`
  query Planner {
    planner {
      plans {
        id
        buckets {
          id
          name
          date
        }
        descendants {
          id
          name
          bucket {
            id
          }
        }
      }
    }
  }
`;
function snapshot(
  buckets = [bucket],
  itemBucket: { __typename: "PlanBucket"; id: string } | null = bucket,
) {
  return {
    planner: {
      __typename: "Planner",
      plans: [
        {
          __typename: "Plan",
          id: "p",
          buckets,
          descendants: [
            {
              __typename: "PlanItem",
              id: "r",
              name: "Grilled Burgers",
              bucket: itemBucket,
            },
          ],
        },
      ],
    },
  };
}
function Harness({ initial }: { initial: BucketAction }) {
  const [action, setAction] = useState<BucketAction | null>(initial);
  const { data } = useQuery<ReturnType<typeof snapshot>>(query);
  return (
    <>
      {action ? (
        <BucketDialog
          action={action}
          plans={[plan]}
          onClose={() => setAction(null)}
        />
      ) : null}
      <div>
        {data?.planner.plans[0].buckets.map((it: typeof bucket) => (
          <span key={it.id}>{it.name}</span>
        ))}
      </div>
      <div>
        {data?.planner.plans[0].descendants.map(
          (it: { id: string; name: string; bucket: { id: string } | null }) => (
            <span key={it.id}>
              {it.name}: {it.bucket ? "bucketed" : "Unplanned"}
            </span>
          ),
        )}
      </div>
    </>
  );
}

describe("bucket management", () => {
  it("exposes edit and remove actions in the header menu", async () => {
    const onAction = vi.fn();
    render(
      <BucketMenu
        plans={[plan]}
        bucketIds={["b"]}
        label="Columbus Day"
        onAction={onAction}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Manage Columbus Day" }),
    );
    await userEvent.click(
      screen.getByRole("menuitem", { name: "Edit Bucket" }),
    );
    expect(onAction).toHaveBeenCalledWith({
      kind: "edit",
      planId: "p",
      bucket,
    });
  });

  it("does not offer management to someone with item-change permission only", () => {
    render(
      <BucketMenu
        plans={[
          {
            ...plan,
            mine: false,
            grants: [{ level: AccessLevel.CHANGE, user: { me: true } }],
          },
        ]}
        bucketIds={["b"]}
        label="Columbus Day"
        onAction={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Manage Columbus Day" }),
    ).not.toBeInTheDocument();
  });

  it("names each plan when a section combines several plans' buckets", async () => {
    const onAction = vi.fn();
    const other = {
      ...plan,
      id: "other",
      name: "Family",
      buckets: [{ ...bucket, id: "family-b" }],
    };
    render(
      <BucketMenu
        plans={[plan, other]}
        bucketIds={["b", "family-b"]}
        label="Columbus Day"
        onAction={onAction}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Manage Columbus Day" }),
    );
    await userEvent.click(
      screen.getByRole("menuitem", { name: "Remove Bucket in Family" }),
    );
    expect(onAction).toHaveBeenCalledWith({
      kind: "remove",
      planId: "other",
      bucket: other.buckets[0],
    });
  });

  it("creates a named bucket on the chosen date and refreshes the timeline", async () => {
    const newBucket = {
      ...bucket,
      id: "new",
      name: "Dinner",
      date: "2026-10-13",
    };
    render(<Harness initial={{ kind: "create", date: "2026-10-13" }} />, {
      mocks: [
        { request: { query }, result: { data: snapshot() } },
        {
          request: {
            query: CreateNamedBucketDocument,
            variables: { planId: "p", name: "Dinner", date: "2026-10-13" },
          },
          result: {
            data: {
              planner: {
                __typename: "PlannerMutation",
                bucket: newBucket,
              },
            },
          },
        },
        { request: { query }, result: { data: snapshot([bucket, newBucket]) } },
      ],
    });
    expect(screen.getByLabelText("Date")).toHaveValue("2026-10-13");
    await userEvent.type(screen.getByLabelText("Name"), " Dinner ");
    await userEvent.click(screen.getByRole("button", { name: "Add Bucket" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Dinner")).toBeInTheDocument();
  });

  it("requires a nonblank name and preserves the draft on failure", async () => {
    render(
      <BucketDialog
        action={{ kind: "create", date: null }}
        plans={[plan]}
        onClose={vi.fn()}
      />,
      {
        mocks: [
          {
            request: {
              query: CreateNamedBucketDocument,
              variables: { planId: "p", name: "Dinner", date: null },
            },
            error: new Error("Unavailable"),
          },
        ],
      },
    );
    await userEvent.click(screen.getByRole("button", { name: "Add Bucket" }));
    expect(await screen.findByText("Enter a bucket name.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveFocus();
    await userEvent.type(screen.getByLabelText("Name"), "Dinner");
    await userEvent.click(screen.getByRole("button", { name: "Add Bucket" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save",
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Dinner");
  });

  it("renames a bucket and clears its date", async () => {
    const edited = { ...bucket, name: "Holiday", date: null };
    render(<Harness initial={{ kind: "edit", planId: "p", bucket }} />, {
      mocks: [
        { request: { query }, result: { data: snapshot() } },
        {
          request: {
            query: UpdateNamedBucketDocument,
            variables: {
              planId: "p",
              bucketId: "b",
              name: "Holiday",
              date: null,
            },
          },
          result: {
            data: {
              planner: { __typename: "PlannerMutation", bucket: edited },
            },
          },
        },
        { request: { query }, result: { data: snapshot([edited]) } },
      ],
    });
    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "Holiday");
    await userEvent.clear(screen.getByLabelText("Date"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Holiday")).toBeInTheDocument();
  });

  it("removes the bucket while keeping the recipe in the refreshed plan", async () => {
    render(<Harness initial={{ kind: "remove", planId: "p", bucket }} />, {
      mocks: [
        { request: { query }, result: { data: snapshot() } },
        {
          request: {
            query: RemoveNamedBucketDocument,
            variables: { planId: "p", bucketId: "b" },
          },
          result: {
            data: {
              planner: {
                __typename: "PlannerMutation",
                deleteBucket: { __typename: "Deletion", id: "b" },
              },
            },
          },
        },
        { request: { query }, result: { data: snapshot([], null) } },
      ],
    });
    expect(screen.getByText(/Recipes and items will stay/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Remove Bucket" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Grilled Burgers: Unplanned")).toBeInTheDocument();
    expect(screen.queryByText("Columbus Day")).not.toBeInTheDocument();
  });
});
