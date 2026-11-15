import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
} from "@/test";
import type { MockLink } from "@apollo/client/testing";
import { describe, expect, it } from "vitest";
import {
  BorrowedSectionFragmentDoc,
  type BorrowedSectionFragment,
} from "./__generated__/borrowedSection.generated";
import { GetBorrowedSectionDocument } from "./__generated__/getBorrowedSection.generated";
import { SearchSectionsDocument } from "./__generated__/searchSections.generated";
import { BorrowedSection } from "./borrowed-section";

const VINAIGRETTE_ID = "section-vinaigrette";
const GREEN_SALAD_ID = "recipe-green-salad";

const VINAIGRETTE = {
  __typename: "Section",
  id: VINAIGRETTE_ID,
  name: "Vinaigrette",
  sectionOf: { __typename: "Recipe", id: GREEN_SALAD_ID, name: "Green salad" },
  directions: "Whisk until emulsified.",
  ingredients: [
    {
      __typename: "IngredientRef",
      raw: "3 tbsp olive oil",
      preparation: null,
      quantity: {
        __typename: "Quantity",
        quantity: 3,
        units: { __typename: "UnitOfMeasure", id: "uom-tbsp", name: "tbsp" },
      },
      ingredient: {
        __typename: "PantryItem",
        id: "pantry-olive-oil",
        name: "olive oil",
      },
    },
  ],
} as const satisfies Parameters<
  typeof seedFragment<BorrowedSectionFragment>
>[3];

function fetched(): MockLink.MockedResponse {
  return {
    request: {
      query: GetBorrowedSectionDocument,
      variables: { id: VINAIGRETTE_ID },
    },
    result: {
      data: {
        library: {
          __typename: "LibraryQuery",
          getSectionById: VINAIGRETTE,
        },
      },
    },
  };
}

describe("BorrowedSection", () => {
  it("shows a cached section in full, read-only, with its recipe", () => {
    const cache = buildInMemoryCache();
    seedFragment(
      cache,
      BorrowedSectionFragmentDoc,
      "borrowedSection",
      VINAIGRETTE,
    );

    render(<BorrowedSection sectionId={VINAIGRETTE_ID} />, { cache });

    expect(screen.getByText("Vinaigrette")).toHaveTextContent(
      /^Vinaigrette of Green salad$/,
    );
    expect(screen.getByText("olive oil")).toBeVisible();
    expect(screen.getByText("Whisk until emulsified.")).toBeVisible();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("fetches a section the cache doesn't have", async () => {
    render(<BorrowedSection sectionId={VINAIGRETTE_ID} />, {
      mocks: [fetched()],
    });

    expect(screen.getByText("Loading section…")).toBeVisible();
    expect(await screen.findByText("olive oil")).toBeVisible();
    expect(screen.getByText("of Green salad")).toBeVisible();
    expect(screen.queryByText("Loading section…")).not.toBeInTheDocument();
  });

  it("fetches the content of a section the cache only knows from a search", async () => {
    const cache = buildInMemoryCache();
    cache.writeQuery({
      query: SearchSectionsDocument,
      variables: { query: "" },
      data: {
        library: {
          __typename: "LibraryQuery",
          sections: {
            __typename: "SectionConnection",
            edges: [
              {
                __typename: "SectionConnectionEdge",
                node: {
                  __typename: "Section",
                  id: VINAIGRETTE.id,
                  name: VINAIGRETTE.name,
                  sectionOf: VINAIGRETTE.sectionOf,
                },
              },
            ],
            pageInfo: { __typename: "PageInfo", hasNextPage: false },
          },
        },
      },
    });

    render(<BorrowedSection sectionId={VINAIGRETTE_ID} />, {
      cache,
      mocks: [fetched()],
    });

    expect(await screen.findByText("olive oil")).toBeVisible();
    expect(screen.getByText("Whisk until emulsified.")).toBeVisible();
  });

  it("explains a failed fetch and retries it", async () => {
    const user = userEvent.setup();
    render(<BorrowedSection sectionId={VINAIGRETTE_ID} />, {
      mocks: [
        {
          request: fetched().request,
          error: new Error("Failed to fetch"),
        },
        fetched(),
      ],
    });

    expect(await screen.findByText("Couldn’t load this section")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("olive oil")).toBeVisible();
  });

  it("names this recipe when it owns the section", () => {
    const cache = buildInMemoryCache();
    seedFragment(
      cache,
      BorrowedSectionFragmentDoc,
      "borrowedSection",
      VINAIGRETTE,
    );

    render(
      <BorrowedSection sectionId={VINAIGRETTE_ID} recipeId={GREEN_SALAD_ID} />,
      { cache },
    );

    expect(screen.getByText("of this recipe")).toBeVisible();
  });
});
