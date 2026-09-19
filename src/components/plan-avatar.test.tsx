import { render, screen } from "@/test";
import { describe, expect, it } from "vitest";
import PlanAvatar from "./plan-avatar";

const WEEKNIGHTS = { name: "Weeknights", color: "#89ac66" };

describe("PlanAvatar", () => {
  it("fills its circle with its plan's color", () => {
    render(<PlanAvatar plan={WEEKNIGHTS} />);

    expect(screen.getByText("We")).toHaveStyle({
      backgroundColor: WEEKNIGHTS.color,
    });
  });

  it("fills its circle when its plan is selected", () => {
    render(<PlanAvatar plan={WEEKNIGHTS} selected />);

    expect(screen.getByText("We")).toHaveStyle({
      backgroundColor: WEEKNIGHTS.color,
    });
  });

  it("rings its circle when its plan isn't selected", () => {
    render(<PlanAvatar plan={WEEKNIGHTS} selected={false} />);

    const circle = screen.getByText("We");
    expect(circle).not.toHaveStyle({ backgroundColor: WEEKNIGHTS.color });
    expect(circle.style.boxShadow).toContain("inset");
  });
});
