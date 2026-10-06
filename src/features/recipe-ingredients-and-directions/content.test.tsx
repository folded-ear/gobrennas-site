import { render, screen, within } from "@/test";
import { describe, expect, it } from "vitest";
import { RecipeContent, RecipeSection } from "./content";

describe("RecipeContent", () => {
  it("renders plain content without a library recipe or plan", () => {
    render(
      <RecipeSection title="Sauce">
        <RecipeContent
          headingLevel={3}
          ingredients={[
            {
              text: "",
              name: "tomatoes",
              preparation: "chopped",
              quantity: 2,
              unit: "cups",
            },
            { text: "salt to taste" },
          ]}
          directions={"Simmer gently.\n\nTaste and season."}
        />
      </RecipeSection>,
    );
    const section = screen.getByRole("region", { name: "Sauce" });
    expect(
      within(section).getByRole("heading", { name: "Ingredients", level: 3 }),
    ).toBeVisible();
    expect(
      within(section)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["2 cups tomatoes, chopped", "salt to taste"]);
    expect(within(section).getByText(/Simmer gently/).textContent).toBe(
      "Simmer gently.\n\nTaste and season.",
    );
  });

  it("explains missing ingredients and directions", () => {
    render(<RecipeContent ingredients={[]} directions="  " />);
    expect(screen.getByText("No ingredients listed.")).toBeVisible();
    expect(screen.getByText("No directions provided.")).toBeVisible();
  });

  it("styles saved quantity, unit, and ingredient as read-only Morsel text, with the quantity as a fraction", () => {
    render(
      <RecipeContent
        ingredients={[
          {
            text: "",
            quantity: 0.5,
            unit: "cup",
            name: "sugar",
            preparation: "divided",
          },
        ]}
      />,
    );
    expect(screen.getByText("½")).toHaveClass("morsel-quantity");
    expect(screen.getByText("cup")).toHaveClass("morsel-unit");
    expect(screen.getByText("sugar")).toHaveClass("morsel-ingredient");
    expect(screen.getByRole("listitem")).toHaveTextContent(
      "½ cup sugar, divided",
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
