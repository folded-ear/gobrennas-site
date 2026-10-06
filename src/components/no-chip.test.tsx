import { render, screen } from "@/test";
import { describe, expect, it } from "vitest";
import { NoChip } from "./no-chip";

describe("NoChip", () => {
  it("says none is called for", () => {
    render(<NoChip />);

    expect(screen.getByText("NO")).toBeVisible();
  });
});
