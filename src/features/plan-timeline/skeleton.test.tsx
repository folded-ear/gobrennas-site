import { render, screen } from "@/test";
import { describe, expect, it } from "vitest";
import { TimelineSkeleton } from "./skeleton";

describe("TimelineSkeleton", () => {
  it("tells a screen reader the plan is on its way", () => {
    render(<TimelineSkeleton />);

    expect(screen.getByRole("status")).toHaveAccessibleName("Loading the plan");
  });

  it("announces nothing but that, so the bars stay silent", () => {
    render(<TimelineSkeleton />);

    expect(screen.getByRole("status").textContent).toBe("");
  });
});
