import { render, screen } from "@/test";
import { describe, expect, it } from "vitest";
import PlanAvatar from "./plan-avatar";

const WEEKNIGHTS = { name: "Weeknights", color: "#89ac66" };

describe("PlanAvatar", () => {
  it("shows its plan's initials", () => {
    render(<PlanAvatar plan={WEEKNIGHTS} />);

    expect(screen.getByTitle(WEEKNIGHTS.name)).toHaveTextContent("We");
  });

  it("is filled by default", () => {
    render(<PlanAvatar plan={WEEKNIGHTS} />);

    expect(screen.getByTitle(WEEKNIGHTS.name)).not.toHaveAttribute(
      "data-unselected",
    );
  });

  it("is filled when its plan is selected", () => {
    render(<PlanAvatar plan={WEEKNIGHTS} selected />);

    expect(screen.getByTitle(WEEKNIGHTS.name)).not.toHaveAttribute(
      "data-unselected",
    );
  });

  it("is a ring when its plan isn't selected", () => {
    render(<PlanAvatar plan={WEEKNIGHTS} selected={false} />);

    expect(screen.getByTitle(WEEKNIGHTS.name)).toHaveAttribute(
      "data-unselected",
    );
  });
});
