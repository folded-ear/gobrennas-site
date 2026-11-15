import { render, screen, userEvent, waitFor } from "@/test";
import type { MockLink } from "@apollo/client/testing";
import { describe, expect, it, vi } from "vitest";
import {
  SearchSectionsDocument,
  type SearchSectionsQuery,
} from "./__generated__/searchSections.generated";
import { AddSectionButton } from "./add-section-button";
import type { BorrowableSection } from "./use-section-search";

type SectionNode =
  SearchSectionsQuery["library"]["sections"]["edges"][number]["node"];

const PIE_CRUST: SectionNode = {
  __typename: "Section",
  id: "section-pie-crust",
  name: "Pie crust",
  sectionOf: {
    __typename: "Recipe",
    id: "recipe-apple-pie",
    name: "Apple pie",
  },
};
const VINAIGRETTE: SectionNode = {
  __typename: "Section",
  id: "section-vinaigrette",
  name: "Vinaigrette",
  sectionOf: {
    __typename: "Recipe",
    id: "recipe-green-salad",
    name: "Green salad",
  },
};
const STOCK_AS_SECTION: SectionNode = {
  __typename: "Section",
  id: "recipe-chicken-stock",
  name: "Chicken stock",
  sectionOf: null,
};

function search(
  query: string,
  nodes: SectionNode[],
  hasNextPage = false,
): MockLink.MockedResponse {
  return {
    request: { query: SearchSectionsDocument, variables: { query } },
    result: {
      data: {
        library: {
          __typename: "LibraryQuery",
          sections: {
            __typename: "SectionConnection",
            edges: nodes.map((node) => ({
              __typename: "SectionConnectionEdge",
              node,
            })),
            pageInfo: { __typename: "PageInfo", hasNextPage },
          },
        },
      },
    },
  };
}

function renderButton(mocks: MockLink.MockedResponse[] = []) {
  const user = userEvent.setup();
  const onAddBlank = vi.fn<() => void>();
  const onBorrow = vi.fn<(section: BorrowableSection) => void>();
  render(
    <AddSectionButton
      isDisabled={false}
      onAddBlank={onAddBlank}
      onBorrow={onBorrow}
    />,
    { mocks },
  );
  return { user, onAddBlank, onBorrow };
}

async function openLibrary(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: "More ways to add a section" }),
  );
  await user.click(
    await screen.findByRole("menuitem", { name: "Add From Library" }),
  );
}

describe("AddSectionButton", () => {
  it("adds a blank section from its main part and from its menu", async () => {
    const { user, onAddBlank } = renderButton();

    await user.click(screen.getByRole("button", { name: "Add section" }));
    expect(onAddBlank).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole("button", { name: "More ways to add a section" }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "New Blank Section" }),
    );
    expect(onAddBlank).toHaveBeenCalledTimes(2);
  });

  it("lists my owned sections with their recipes as soon as the picker opens", async () => {
    const { user } = renderButton([
      search("", [PIE_CRUST, STOCK_AS_SECTION, VINAIGRETTE]),
    ]);

    await openLibrary(user);

    expect(
      screen.getByRole("searchbox", { name: "Search sections" }),
    ).toHaveFocus();
    expect(
      await screen.findByRole("option", { name: "Pie crust (of Apple pie)" }),
    ).toHaveTextContent(/^Pie crust \(of Apple pie\)$/);
    expect(
      screen.getByRole("option", { name: "Vinaigrette (of Green salad)" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("option", { name: /Chicken stock/ }),
    ).not.toBeInTheDocument();
  });

  it("shows it is searching from the first keystroke until matching results arrive", async () => {
    const { user } = renderButton([
      search("", [PIE_CRUST, VINAIGRETTE]),
      search("vin", [VINAIGRETTE]),
    ]);
    await openLibrary(user);
    await screen.findByRole("option", { name: "Pie crust (of Apple pie)" });
    expect(screen.queryByText("Searching…")).not.toBeInTheDocument();

    await user.type(
      screen.getByRole("searchbox", { name: "Search sections" }),
      "vin",
    );

    expect(screen.getByText("Searching…")).toBeVisible();
    expect(
      screen.getByRole("option", { name: "Pie crust (of Apple pie)" }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        screen.queryByRole("option", { name: "Pie crust (of Apple pie)" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByText("Searching…")).not.toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Vinaigrette (of Green salad)" }),
    ).toBeVisible();
  });

  it("hints to keep typing when more sections match than are listed", async () => {
    const { user } = renderButton([search("", [PIE_CRUST], true)]);

    await openLibrary(user);

    expect(
      await screen.findByText(
        "More sections match. Keep typing to narrow the list.",
      ),
    ).toBeVisible();
  });

  it("tells having no sections apart from no matches", async () => {
    const { user } = renderButton([search("", []), search("zzz", [])]);

    await openLibrary(user);
    expect(
      await screen.findByText("You have no sections to borrow yet."),
    ).toBeVisible();

    await user.type(
      screen.getByRole("searchbox", { name: "Search sections" }),
      "zzz",
    );
    expect(await screen.findByText("No sections match “zzz”.")).toBeVisible();
  });

  it("explains a failed search and retries it", async () => {
    const { user } = renderButton([
      {
        request: { query: SearchSectionsDocument, variables: { query: "" } },
        error: new Error("Failed to fetch"),
      },
      search("", [PIE_CRUST]),
    ]);

    await openLibrary(user);
    expect(await screen.findByText("Couldn’t search sections")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByRole("option", { name: "Pie crust (of Apple pie)" }),
    ).toBeVisible();
  });

  it("borrows the picked section, closes, and returns focus to its menu", async () => {
    const { user, onBorrow } = renderButton([
      search("", [PIE_CRUST, VINAIGRETTE]),
    ]);
    await openLibrary(user);

    await user.click(
      await screen.findByRole("option", {
        name: "Vinaigrette (of Green salad)",
      }),
    );

    expect(onBorrow).toHaveBeenCalledExactlyOnceWith({
      id: VINAIGRETTE.id,
      name: VINAIGRETTE.name,
      sectionOf: { id: "recipe-green-salad", name: "Green salad" },
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("searchbox", { name: "Search sections" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "More ways to add a section" }),
    ).toHaveFocus();
  });

  it("closes on Escape without borrowing", async () => {
    const { user, onBorrow } = renderButton([search("", [PIE_CRUST])]);
    await openLibrary(user);
    await screen.findByRole("option", { name: "Pie crust (of Apple pie)" });

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(
        screen.queryByRole("searchbox", { name: "Search sections" }),
      ).not.toBeInTheDocument(),
    );
    expect(onBorrow).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "More ways to add a section" }),
    ).toHaveFocus();
  });
});
