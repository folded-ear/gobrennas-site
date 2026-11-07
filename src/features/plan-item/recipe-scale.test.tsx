import { PlanItemStatus } from "@/__generated__/graphql";
import { usePageEngine } from "@/features/page-engine";
import { changeMutation } from "@/features/page-engine/mutation";
import {
  PlanDirectoryProvider,
  type DirectoryPlan,
} from "@/features/plan-directory";
import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
  waitFor,
} from "@/test";
import type { MockedResponse } from "@apollo/client/testing";
import { describe, expect, it, vi } from "vitest";
import {
  PlanItemFragmentDoc,
  type PlanItemFragment,
} from "./__generated__/planItem.generated";
import {
  ScaleRecipeDocument,
  type ScaleRecipeMutation,
} from "./__generated__/scaleRecipe.generated";
import { PlanRecipeScale } from "./recipe-scale";

const plan: DirectoryPlan = {
  id: "week",
  name: "This week",
  color: "#123456",
  changeable: true,
};
const root: PlanItemFragment = {
  __typename: "PlanItem",
  id: "chili",
  name: "Edited chili",
  status: PlanItemStatus.NEEDED,
  notes: null,
  preparation: null,
  aggregate: null,
  parent: { __typename: "Plan", id: plan.id },
  ingredient: { __typename: "Recipe", id: "saved-chili" },
  quantity: { __typename: "Quantity", quantity: 2, units: null },
  components: [{ __typename: "PlanItem", id: "beans" }],
  bucket: null,
};
const beans: PlanItemFragment = {
  ...root,
  id: "beans",
  name: "5 beans, rinsed",
  preparation: "rinsed",
  parent: { __typename: "PlanItem", id: root.id },
  aggregate: { __typename: "PlanItem", id: root.id },
  ingredient: { __typename: "PantryItem", id: "pantry-beans" },
  quantity: { __typename: "Quantity", quantity: 5, units: null },
  components: [],
};

const rename = {
  kind: "rename",
  id: beans.id,
  planId: plan.id,
  name: "7 beans",
} as const;
function EditIngredient() {
  const engine = usePageEngine();
  return <button onClick={() => engine.rename(rename)}>Edit beans</button>;
}

const saved: ScaleRecipeMutation = {
  planner: {
    __typename: "PlannerMutation",
    scaleRecipe: {
      __typename: "PlanItem",
      id: root.id,
      plan: {
        __typename: "Plan",
        id: plan.id,
        updatedSince: [
          {
            __typename: "PlanItem",
            id: root.id,
            name: root.name,
            quantity: { __typename: "Quantity", quantity: 1, units: null },
          },
          {
            __typename: "PlanItem",
            id: beans.id,
            name: "2.5 beans, rinsed",
            quantity: { __typename: "Quantity", quantity: 2.5, units: null },
          },
        ],
      },
    },
  },
};

function show({
  changeable = true,
  error,
  delay = 0,
  seedBeans = true,
}: {
  changeable?: boolean;
  error?: Error;
  delay?: number;
  seedBeans?: boolean;
} = {}) {
  const cache = buildInMemoryCache();
  seedFragment(cache, PlanItemFragmentDoc, "planItem", root);
  if (seedBeans) seedFragment(cache, PlanItemFragmentDoc, "planItem", beans);
  const editable = { ...plan, changeable };
  const result = vi.fn(() => ({ data: saved }));
  const mock: MockedResponse<ScaleRecipeMutation> = {
    request: {
      query: ScaleRecipeDocument,
      variables: { id: root.id, scale: 1 },
    },
    delay,
    ...(error ? { error } : { result }),
  };
  const renameRequest = changeMutation([rename]);
  render(
    <PlanDirectoryProvider
      directory={{
        plans: [editable],
        planOfItem: new Map([
          [root.id, editable],
          [beans.id, editable],
        ]),
        planOfBucket: new Map(),
      }}
    >
      <PlanRecipeScale itemId={root.id} />
      <EditIngredient />
    </PlanDirectoryProvider>,
    {
      cache,
      mocks: [
        mock,
        ...(error ? [{ request: mock.request, result }] : []),
        {
          request: {
            query: renameRequest.mutation,
            variables: renameRequest.variables,
          },
          delay: Infinity,
          result: { data: {} },
        },
      ],
    },
  );
  return { cache, result };
}

describe("PlanRecipeScale", () => {
  it("waits for the server before updating the multiplier and shopping quantities", async () => {
    const { cache, result } = show({ delay: 50 });
    expect(screen.getByRole("button", { name: "2×" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "1×" }));
    expect(screen.getByRole("button", { name: "1×" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "2×" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      cache.readFragment({
        fragment: PlanItemFragmentDoc,
        id: "PlanItem:beans",
      })?.quantity?.quantity,
    ).toBe(5);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "1×" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    const shown = cache.readFragment({
      fragment: PlanItemFragmentDoc,
      id: "PlanItem:beans",
    });
    expect(shown?.quantity?.quantity).toBe(2.5);
    expect(shown?.name).toBe("2.5 beans, rinsed");
    expect(shown?.preparation).toBe("rinsed");
    expect(shown?.ingredient?.id).toBe("pantry-beans");
    expect(result).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/shopping list/)).toBeVisible();
  });
  it("does not offer persisted scaling to viewers", () => {
    show({ changeable: false });
    expect(
      screen.queryByRole("group", { name: "Recipe scale" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the saved scale after a network failure and permits retry", async () => {
    const { cache } = show({ error: new Error("Offline") });
    const before = cache.extract();
    await userEvent.click(screen.getByRole("button", { name: "1×" }));
    expect(await screen.findByText("Couldn’t scale recipe")).toBeVisible();
    expect(screen.getByRole("button", { name: "1×" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "2×" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(cache.extract()).toEqual(before);
    await userEvent.click(screen.getByRole("button", { name: "1×" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "1×" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
  });

  it("scales without loading the ingredient graph first", async () => {
    const { result } = show({ seedBeans: false });
    await userEvent.click(screen.getByRole("button", { name: "1×" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "1×" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(result).toHaveBeenCalledTimes(1);
  });

  it("leaves pending ingredient edits alone instead of racing them", async () => {
    const { cache, result } = show();
    await userEvent.click(screen.getByRole("button", { name: "Edit beans" }));
    await userEvent.click(screen.getByRole("button", { name: "1×" }));
    expect(
      await screen.findByText("Plan changes are still saving"),
    ).toBeVisible();
    expect(result).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "2×" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const item = cache.readFragment({
      fragment: PlanItemFragmentDoc,
      id: "PlanItem:beans",
    });
    expect(item?.name).toBe("7 beans");
    expect(item?.quantity).toBeNull();
  });
});
