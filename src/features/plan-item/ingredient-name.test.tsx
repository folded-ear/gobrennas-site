import { RecognizedRangeType } from "@/__generated__/graphql";
import {
  RecognizeIngredientDocument,
  type RecognizeIngredientQuery,
} from "@/features/recipe-form/__generated__/recognizeIngredient.generated";
import { render, screen, waitFor } from "@/test";
import { MockLink } from "@apollo/client/testing";
import { describe, expect, it, vi } from "vitest";
import { IngredientName } from "./ingredient-name";

const RAW = '1½ cups "flour", sifted';

function recognized(
  raw = RAW,
): MockLink.MockedResponse<RecognizeIngredientQuery> {
  return {
    request: {
      query: RecognizeIngredientDocument,
      variables: { raw, cursor: raw.length, choice: null, suggest: false },
    },
    delay: 0,
    result: {
      data: {
        library: {
          __typename: "LibraryQuery",
          recognizeItem: {
            __typename: "RecognizedItem",
            raw,
            cursor: raw.length,
            ranges: [
              {
                __typename: "RecognizedRange",
                start: 0,
                end: 2,
                type: RecognizedRangeType.QUANTITY,
                quantity: 1.5,
                id: null,
              },
              {
                __typename: "RecognizedRange",
                start: 3,
                end: 7,
                type: RecognizedRangeType.UNIT,
                quantity: null,
                id: "cup",
              },
              {
                __typename: "RecognizedRange",
                start: 8,
                end: 15,
                type: RecognizedRangeType.ITEM,
                quantity: null,
                id: "flour",
              },
            ],
          },
        },
      },
    },
  };
}

describe("IngredientName", () => {
  it("highlights the original fraction, units, and quoted ingredient without rewriting the row", async () => {
    render(
      <p>
        <IngredientName name={RAW} />
      </p>,
      { mocks: [recognized()] },
    );

    expect(screen.getByRole("paragraph").textContent).toBe(RAW);
    expect(await screen.findByText('"flour"')).toHaveClass("morsel-ingredient");
    expect(screen.getByText("1½")).toHaveClass("morsel-quantity");
    expect(screen.getByText("cups")).toHaveClass("morsel-unit");
    expect(screen.getByRole("paragraph").textContent).toBe(RAW);
  });

  it("shows a renamed row immediately while its new recognition is pending", async () => {
    const renamed = RAW.replace("flour", "sugar");
    const { rerender } = render(<IngredientName name={RAW} />, {
      mocks: [recognized(), { ...recognized(renamed), delay: Infinity }],
    });
    expect(await screen.findByText('"flour"')).toHaveClass("morsel-ingredient");

    rerender(<IngredientName name={renamed} />);

    expect(screen.getByText(renamed)).toBeVisible();
    expect(screen.queryByText('"flour"')).not.toBeInTheDocument();
  });

  it.each(["failed", "overlapping"] as const)(
    "keeps the entire row readable after %s recognition",
    async (failure) => {
      const mock = recognized();
      const result = vi.fn(() =>
        failure === "failed"
          ? {
              errors: [{ message: "Recognition unavailable" }],
            }
          : {
              data: {
                library: {
                  __typename: "LibraryQuery" as const,
                  recognizeItem: {
                    __typename: "RecognizedItem" as const,
                    raw: RAW,
                    cursor: RAW.length,
                    ranges: [
                      {
                        __typename: "RecognizedRange" as const,
                        start: 0,
                        end: 2,
                        type: RecognizedRangeType.QUANTITY,
                        quantity: 1.5,
                        id: null,
                      },
                      {
                        __typename: "RecognizedRange" as const,
                        start: 0,
                        end: 15,
                        type: RecognizedRangeType.ITEM,
                        quantity: null,
                        id: "flour",
                      },
                    ],
                  },
                },
              } satisfies RecognizeIngredientQuery,
            },
      );
      render(
        <p>
          <IngredientName name={RAW} />
        </p>,
        { mocks: [{ ...mock, result }] },
      );

      await waitFor(() => expect(result).toHaveBeenCalledOnce());

      expect(screen.getByRole("paragraph").textContent).toBe(RAW);
      expect(screen.getByText(RAW)).toBeVisible();
      expect(screen.queryByText('"flour"')).not.toBeInTheDocument();
    },
  );
});
