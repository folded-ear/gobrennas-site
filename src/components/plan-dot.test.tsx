import { render, screen, within } from "@/test";
import { describe, expect, it } from "vitest";
import { PlanDot, PlanDotStack } from "./plan-dot";

const WEEKNIGHTS = { id: "1", name: "Weeknights", color: "#F57F17" };
const NEIGHBOR = { id: "3", name: "Neighborhood potluck", color: "#1E88E5" };

describe("PlanDot", () => {
  it("names its plan", () => {
    render(<PlanDot plan={WEEKNIGHTS} />);

    const dot = screen.getByRole("img", { name: "Weeknights" });
    expect(dot).toHaveAttribute("title", "Weeknights");
  });
});

describe("PlanDotStack", () => {
  it("names each of its plans, in the order given", () => {
    render(<PlanDotStack plans={[WEEKNIGHTS, NEIGHBOR]} />);

    const stack = screen.getByRole("group", { name: "Plans" });
    expect(
      within(stack)
        .getAllByRole("img")
        .map((dot) => dot.getAttribute("aria-label")),
    ).toEqual(["Weeknights", "Neighborhood potluck"]);
  });
});
