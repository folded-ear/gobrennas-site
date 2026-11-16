import { render, screen, userEvent, within } from "@/test";
import { describe, expect, it } from "vitest";
import { RecipeContent, RecipeSection } from "./content";

describe("RecipeSection", () => {
  it("starts collapsed to its title, and expands from it", async () => {
    render(
      <RecipeSection title="Sauce" defaultExpanded={false}>
        <p>Simmer gently.</p>
      </RecipeSection>,
    );
    const section = screen.getByRole("region", { name: "Sauce" });
    const heading = within(section).getByRole("heading", {
      name: "Sauce",
      level: 2,
    });
    const toggle = within(heading).getByRole("button", { name: "Sauce" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(within(section).getByText("Simmer gently.")).not.toBeVisible();

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(section).getByText("Simmer gently.")).toBeVisible();
  });

  it("starts expanded by default, and collapses from its title", async () => {
    render(
      <RecipeSection title="Sauce">
        <p>Simmer gently.</p>
      </RecipeSection>,
    );
    const toggle = screen.getByRole("button", { name: "Sauce" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Simmer gently.")).toBeVisible();

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Simmer gently.")).not.toBeVisible();
  });
});

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
    expect(within(section).getByText("Simmer gently.")).toBeVisible();
    expect(within(section).getByText("Taste and season.")).toBeVisible();
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
