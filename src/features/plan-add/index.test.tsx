import {
  PlanItemStatus,
  RecognitionKind,
  RecognizedRangeType,
} from "@/__generated__/graphql";
import {
  editableMorsel,
  withTextInsertion,
} from "@/features/morsel/test-helpers";
import {
  PlanItemResultFragmentDoc,
  type PlanItemResultFragment,
} from "@/features/page-engine/__generated__/planItemResult.generated";
import {
  seededCache,
  THANKSGIVING,
} from "@/features/page-engine/test/status-cache";
import {
  buildPlanDirectory,
  PlanDirectoryProvider,
} from "@/features/plan-directory";
import { PlanItemDetail, PlanItemHeader } from "@/features/plan-item/detail";
import { PlanTimeline } from "@/features/plan-timeline";
import { buildPlanContext } from "@/features/plan-timeline/context";
import type { TimelineSection } from "@/features/plan-timeline/model";
import { buildSubtree } from "@/features/plan-timeline/model";
import {
  FAILURE_TOAST_TITLE,
  failureToastLink,
} from "@/lib/apollo/failure-toast-link";
import { render, screen, userEvent, waitFor } from "@/test";
import { ApolloClient, ApolloLink, gql, Observable } from "@apollo/client";
import { LocalState } from "@apollo/client/local-state";
import type { GraphQLCodegenDataMasking } from "@apollo/client/masking";
import { useQuery } from "@apollo/client/react";
import { print } from "@apollo/client/utilities";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { AddPlannerRecipeMutation } from "./__generated__/addPlannerRecipe.generated";
import type { AddPlan } from "./destination";
import { PlanAdd } from "./index";

const plan: AddPlan = {
  __typename: "Plan",
  id: THANKSGIVING,
  name: "Thanksgiving",
  color: "#ff0000",
  mine: true,
  grants: [],
  children: [{ id: "1" }, { id: "3" }],
  buckets: [],
};
const unplanned: TimelineSection = { kind: "unplanned", roots: [] };
const day: TimelineSection = { kind: "day", date: "2026-10-02", roots: [] };

const ingredient = {
  __typename: "PlanItem" as const,
  id: "101",
  name: "2 carrots",
  status: PlanItemStatus.NEEDED,
  notes: null,
  preparation: null,
  parent: { __typename: "PlanItem" as const, id: "100" },
  aggregate: { __typename: "PlanItem" as const, id: "100" },
  ingredient: {
    __typename: "PantryItem" as const,
    id: "carrot",
    name: "carrot",
    storeOrder: 1,
  },
  quantity: { __typename: "Quantity" as const, quantity: 2, units: null },
  components: [],
  children: [],
  bucket: null,
};
const addedRecipe: GraphQLCodegenDataMasking.Unmasked<AddPlannerRecipeMutation> =
  {
    library: {
      __typename: "LibraryMutation",
      sendRecipeToPlan: {
        ...ingredient,
        id: "100",
        name: "Soup",
        aggregate: null,
        parent: { __typename: "Plan", id: THANKSGIVING },
        ingredient: { __typename: "Recipe", id: "recipe-soup", name: "Soup" },
        quantity: { __typename: "Quantity", quantity: 1, units: null },
        children: [{ __typename: "PlanItem", id: "101" }],
        components: [{ __typename: "PlanItem", id: "101" }],
        descendants: [ingredient],
      },
    },
  };

// Observe the same flat tree the planner uses, so a saved recipe must appear
// with working cooking/details controls without a reload or refetch.
const SAVED_PLAN = gql`
  query AddedRecipePlan {
    planner {
      plan(id: "7") {
        id
        children {
          id
        }
        descendants {
          ...planItemResult @unmask
        }
      }
    }
  }
  ${print(PlanItemResultFragmentDoc)}
`;
type SavedPlanData = {
  planner: {
    plan: {
      id: string;
      children: { id: string }[];
      descendants: Omit<PlanItemResultFragment, " $fragmentName">[];
    };
  };
};

function SavedPlan() {
  const { data } = useQuery<SavedPlanData>(SAVED_PLAN);
  const [openId, setOpenId] = useState<string>();
  if (!data) return null;
  const items = data.planner.plan.descendants;
  const timelinePlans = [
    {
      rootIds: data.planner.plan.children.map((it) => it.id),
      items,
      buckets: [],
    },
  ];
  const context = buildPlanContext({ plans: timelinePlans });
  const opened = items.find((it) => it.id === openId);
  const descendants = opened ? buildSubtree(items, opened.id) : [];
  return (
    <PlanDirectoryProvider
      directory={buildPlanDirectory([{ ...plan, descendants: items }])}
    >
      <PlanTimeline plans={timelinePlans} onSelect={setOpenId} />
      {opened ? (
        <section aria-label="Item details">
          <PlanItemHeader
            item={opened}
            context={context}
            hasDescendants={descendants.length > 0}
          />
          <PlanItemDetail
            context={context}
            descendants={descendants}
            parentId={opened.id}
          />
        </section>
      ) : null}
    </PlanDirectoryProvider>
  );
}

function setup({
  section = unplanned,
  showSavedPlan = false,
  failFreshRecognition = false,
  failing,
}: {
  section?: TimelineSection;
  showSavedPlan?: boolean;
  failFreshRecognition?: boolean;
  /** An operation the API fails, by name. */
  failing?: string;
} = {}) {
  const requests: {
    name: string;
    variables: Record<string, unknown>;
    query: string;
  }[] = [];
  const client = new ApolloClient({
    cache: seededCache(),
    dataMasking: true,
    localState: new LocalState(),
    link: failureToastLink.concat(
      new ApolloLink(
        (operation) =>
          new Observable((observer) => {
            const v = operation.variables;
            requests.push({
              name: operation.operationName ?? "",
              variables: v,
              query: print(operation.query),
            });
            if (operation.operationName === failing) {
              observer.error(new Error("Failed to fetch"));
              return;
            }
            if (operation.operationName === "recognizeIngredient") {
              if (failFreshRecognition && v.raw === "3 Soup" && !v.suggest) {
                observer.error(new Error("Recognition unavailable"));
                return;
              }
              const prefix = /^(\d+(?:\.\d+)?(?:\/\d+)?)\s+/.exec(v.raw);
              const amount = prefix?.[1];
              const [numerator, denominator = "1"] = amount?.split("/") ?? [];
              const ranges = amount
                ? [
                    {
                      start: 0,
                      end: amount.length,
                      type: RecognizedRangeType.QUANTITY,
                      quantity: Number(numerator) / Number(denominator),
                      id: null,
                    },
                  ]
                : [];
              observer.next({
                data: {
                  library: {
                    recognizeItem: {
                      raw: v.raw,
                      cursor: v.cursor,
                      ranges,
                      suggestions: [
                        {
                          name: "Soup",
                          kind: RecognitionKind.PANTRY_ITEM,
                          detail: null,
                          target: {
                            start: prefix?.[0].length ?? 0,
                            end: v.raw.length,
                            type: RecognizedRangeType.ITEM,
                            id: "pantry-soup",
                          },
                        },
                        {
                          name: "Soup",
                          kind: RecognitionKind.RECIPE,
                          detail: null,
                          target: {
                            start: prefix?.[0].length ?? 0,
                            end: v.raw.length,
                            type: RecognizedRangeType.ITEM,
                            id: "recipe-soup",
                          },
                        },
                        {
                          name: "Stock",
                          kind: RecognitionKind.SECTION,
                          detail: "Chicken soup",
                          target: {
                            start: prefix?.[0].length ?? 0,
                            end: v.raw.length,
                            type: RecognizedRangeType.ITEM,
                            id: "section-stock",
                          },
                        },
                      ],
                    },
                  },
                },
              });
            } else if (operation.operationName === "doCreateBucket") {
              observer.next({
                data: {
                  planner: {
                    __typename: "PlannerMutation",
                    createBucket: {
                      __typename: "PlanBucket",
                      id: "bucket-new",
                      name: v.name,
                      date: v.date,
                    },
                  },
                },
              });
            } else if (operation.operationName === "addPlannerRecipe") {
              observer.next({ data: addedRecipe });
            } else if (operation.operationName === "doChanges") {
              const planner: Record<string, unknown> = {
                __typename: "PlannerMutation",
              };
              for (let i = 0; `name${i}` in v || `id${i}` in v; i++) {
                planner[`s${i}`] =
                  `parentId${i}` in v
                    ? {
                        __typename: "PlanItem",
                        id: "100",
                        name: v[`name${i}`],
                        status: "NEEDED",
                        notes: null,
                        parent: { __typename: "Plan", id: v[`parentId${i}`] },
                        aggregate: null,
                        preparation: null,
                        ingredient: null,
                        quantity: null,
                        components: [],
                        bucket: null,
                        children: [],
                      }
                    : {
                        __typename: "PlanItem",
                        id: v[`id${i}`],
                        bucket: {
                          __typename: "PlanBucket",
                          id: v[`bucketId${i}`],
                        },
                      };
              }
              observer.next({ data: { planner } });
            } else {
              observer.error(
                new Error(`Unexpected operation: ${operation.operationName}`),
              );
              return;
            }
            observer.complete();
          }),
      ),
    ),
  });
  if (showSavedPlan) {
    client.cache.writeQuery({
      query: SAVED_PLAN,
      data: {
        planner: {
          __typename: "PlannerQuery",
          plan: {
            __typename: "Plan",
            id: plan.id,
            children: plan.children.map((it) => ({
              __typename: "PlanItem",
              id: it.id,
            })),
            descendants: [],
          },
        },
      },
    });
  }
  render(
    <>
      <PlanAdd plans={[plan]} section={section} />
      {showSavedPlan ? <SavedPlan /> : null}
    </>,
    { client },
  );
  return { requests, client, user: userEvent.setup() };
}

withTextInsertion();

describe("planner Add", () => {
  it("adds a selected recipe with its ingredients, cooking link, and working detail view", async () => {
    const { user, requests, client } = setup({ showSavedPlan: true });
    await user.click(screen.getByRole("button", { name: "Add to Unplanned" }));
    await user.type(editableMorsel("Item for Unplanned"), "So");
    await user.click((await screen.findAllByRole("option"))[1]);
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(
      await screen.findByRole("link", { name: "Cook Soup" }),
    ).toHaveAttribute("href", `/plan/${THANKSGIVING}/recipe/100`);
    await user.click(screen.getByRole("button", { name: "Soup" }));
    expect(
      screen.getByRole("region", { name: "Item details" }),
    ).toHaveTextContent("2 carrots");
    expect(requests.filter((it) => it.name === "doChanges")).toHaveLength(0);
    expect(
      requests
        .filter((it) => it.name === "addPlannerRecipe")
        .map((it) => it.variables),
    ).toEqual([{ planId: THANKSGIVING, recipeId: "recipe-soup", scale: 1 }]);
    const saved = client.cache.readQuery<SavedPlanData>({ query: SAVED_PLAN });
    expect(saved?.planner.plan.children.map((it) => it.id)).toEqual([
      "1",
      "3",
      "100",
    ]);
    expect(saved?.planner.plan.descendants.map((it) => it.id)).toEqual([
      "100",
      "101",
    ]);
  });

  it.each([
    ["2", 2],
    ["1/2", 0.5],
  ])(
    "uses the recognized quantity %s as the recipe scale",
    async (quantity, scale) => {
      const { user, requests } = setup();
      await user.click(
        screen.getByRole("button", { name: "Add to Unplanned" }),
      );
      await user.type(editableMorsel("Item for Unplanned"), `${quantity} So`);
      await user.click((await screen.findAllByRole("option"))[1]);
      await user.click(screen.getByRole("button", { name: "Add" }));
      await waitFor(() =>
        expect(screen.queryByRole("form")).not.toBeInTheDocument(),
      );
      const saved = requests.find((it) => it.name === "addPlannerRecipe");
      expect(saved?.variables).toEqual({
        planId: THANKSGIVING,
        recipeId: "recipe-soup",
        scale,
      });
      expect(saved?.query).toContain("scale: $scale");
    },
  );

  it("recognizes the latest quantity when Add is pressed before the editor's debounce", async () => {
    const { user, requests } = setup();
    await user.click(screen.getByRole("button", { name: "Add to Unplanned" }));
    const input = editableMorsel("Item for Unplanned");
    await user.type(input, "2 So");
    await user.click((await screen.findAllByRole("option"))[1]);
    await user.keyboard("{Home}{Delete}3");
    expect(input).toHaveTextContent("3 Soup");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(screen.queryByRole("form")).not.toBeInTheDocument(),
    );
    expect(
      requests.find((it) => it.name === "addPlannerRecipe")?.variables,
    ).toMatchObject({ scale: 3 });
    expect(
      requests.filter(
        (it) =>
          it.name === "recognizeIngredient" &&
          it.variables.raw === "3 Soup" &&
          it.variables.suggest === false,
      ),
    ).toHaveLength(1);
  });

  it("keeps the draft when fresh quantity recognition fails instead of adding a single batch", async () => {
    const { user, requests } = setup({ failFreshRecognition: true });
    await user.click(screen.getByRole("button", { name: "Add to Unplanned" }));
    const input = editableMorsel("Item for Unplanned");
    await user.type(input, "2 So");
    await user.click((await screen.findAllByRole("option"))[1]);
    await user.keyboard("{Home}{Delete}3");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your text is still here",
    );
    expect(input).toHaveTextContent("3 Soup");
    expect(
      requests.filter((it) => it.name === "addPlannerRecipe"),
    ).toHaveLength(0);
  });

  it("rejects a zero recipe quantity before creating the destination bucket", async () => {
    const { user, requests } = setup({ section: day });
    await user.click(screen.getByRole("button", { name: /^Add to/ }));
    await user.type(editableMorsel("Item for Fri, Oct 2"), "0 So");
    await user.click((await screen.findAllByRole("option"))[1]);
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "greater than zero",
    );
    expect(
      requests.filter((it) => it.name !== "recognizeIngredient"),
    ).toHaveLength(0);
  });

  it("adds a recipe once, and places it in a new day bucket", async () => {
    const { user, requests } = setup({ section: day });
    await user.click(screen.getByRole("button", { name: /^Add to/ }));
    await user.type(editableMorsel("Item for Fri, Oct 2"), "So");
    await user.click((await screen.findAllByRole("option"))[1]);
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(screen.queryByRole("form")).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        requests
          .filter((it) => it.name === "doChanges")
          .map((it) => it.variables),
      ).toEqual([{ id0: "100", bucketId0: "bucket-new" }]),
    );
    expect(
      requests.filter((it) => it.name === "addPlannerRecipe"),
    ).toHaveLength(1);
  });

  it("shows all suggestion kinds and saves the chosen identity through the page engine", async () => {
    const { user, requests } = setup();
    await user.click(screen.getByRole("button", { name: "Add to Unplanned" }));
    const input = editableMorsel("Item for Unplanned");
    expect(input).toHaveFocus();
    await user.type(input, "So");
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(3);
    expect(screen.getByText("Chicken soup")).toBeInTheDocument();
    await user.click(options[0]);
    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(screen.queryByRole("form")).not.toBeInTheDocument(),
    );
    const saved = await waitFor(() => {
      const found = requests.find((it) => it.name === "doChanges");
      expect(found).toBeDefined();
      return found;
    });
    expect(saved?.variables).toMatchObject({
      parentId0: THANKSGIVING,
      afterId0: "3",
      name0: "Soup",
      choice0: { id: "pantry-soup", start: 0, end: 4 },
    });
    expect(saved?.query).toContain("$choice0: RecognitionChoice");
    expect(saved?.query).toContain("choice: $choice0");
    expect(
      screen.getByRole("button", { name: "Add to Unplanned" }),
    ).toHaveFocus();
  });

  it("saves plain text without choice and honors the recognition opt-out", async () => {
    const { user, requests } = setup();
    await user.click(screen.getByRole("button", { name: "Add to Unplanned" }));
    await user.type(editableMorsel("Item for Unplanned"), "!Takeout");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(screen.queryByRole("form")).not.toBeInTheDocument(),
    );
    const saved = await waitFor(() => {
      const found = requests.find((it) => it.name === "doChanges");
      expect(found).toBeDefined();
      return found;
    });
    expect(saved?.variables).toEqual({
      parentId0: THANKSGIVING,
      afterId0: "3",
      name0: "!Takeout",
    });
    expect(saved?.query).not.toContain("choice");
  });

  it("creates a missing day bucket, then the item in it", async () => {
    const { user, requests } = setup({ section: day });
    await user.click(screen.getByRole("button", { name: /^Add to/ }));
    await user.type(
      editableMorsel(screen.getByRole("combobox").getAttribute("aria-label")!),
      "!Dinner",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(screen.queryByRole("form")).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        requests
          .filter((it) => it.name === "doChanges")
          .map((it) => it.variables),
      ).toEqual([
        { parentId0: THANKSGIVING, afterId0: "3", name0: "!Dinner" },
        { id0: "100", bucketId0: "bucket-new" },
      ]),
    );
    expect(
      requests
        .filter((it) => it.name === "doCreateBucket")
        .map((it) => it.variables),
    ).toEqual([{ planId: THANKSGIVING, date: "2026-10-02", name: null }]);
  });

  it("keeps the draft and says so when the recipe can't be added", async () => {
    const { user } = setup({ failing: "addPlannerRecipe" });
    await user.click(screen.getByRole("button", { name: "Add to Unplanned" }));
    const input = editableMorsel("Item for Unplanned");
    await user.type(input, "So");
    await user.click((await screen.findAllByRole("option"))[1]);
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText(/Couldn’t add this item/)).toBeVisible();
    expect(screen.queryByText(FAILURE_TOAST_TITLE)).not.toBeInTheDocument();
    expect(input).toHaveTextContent("Soup");
  });

  it("keeps the draft and says so when the day bucket can't be made", async () => {
    const { user } = setup({ section: day, failing: "doCreateBucket" });
    await user.click(screen.getByRole("button", { name: /^Add to/ }));
    const input = editableMorsel("Item for Fri, Oct 2");
    await user.type(input, "!Dinner");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText(/Couldn’t add this item/)).toBeVisible();
    expect(screen.queryByText(FAILURE_TOAST_TITLE)).not.toBeInTheDocument();
    expect(input).toHaveTextContent("!Dinner");
  });

  it("cancels without saving", async () => {
    const { user, requests } = setup();
    await user.click(screen.getByRole("button", { name: "Add to Unplanned" }));
    await user.type(editableMorsel("Item for Unplanned"), "!Dinner");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(requests.filter((it) => it.name !== "recognizeIngredient")).toEqual(
      [],
    );
    expect(
      screen.getByRole("button", { name: "Add to Unplanned" }),
    ).toHaveFocus();
  });
});
