import { render, screen } from "@/test";
import { describe, expect, it } from "vitest";
import { DateChip, ParentChip } from "./chips";

const WEDNESDAY = "2026-11-25";
const THURSDAY = "2026-11-26";

describe("DateChip", () => {
  it("shows the day something happens", () => {
    render(<DateChip date={THURSDAY} />);

    expect(screen.getByText("Thu, Nov 26")).toBeVisible();
  });

  it("says a late item is late, and not by colour alone", () => {
    render(<DateChip date={THURSDAY} separation="late" />);

    expect(screen.getByText(/out of order/)).toBeInTheDocument();
  });

  it("says nothing extra about an item made ahead", () => {
    render(<DateChip date={WEDNESDAY} separation="early" />);

    expect(screen.getByText("Wed, Nov 25")).toBeVisible();
    expect(screen.queryByText(/out of order/)).toBeNull();
  });

  it("says nothing extra about an item where it belongs", () => {
    render(<DateChip date={THURSDAY} />);

    expect(screen.getByText("Thu, Nov 26")).toBeVisible();
    expect(screen.queryByText(/out of order/)).toBeNull();
  });
});

describe("ParentChip", () => {
  it("names the item something sits under", () => {
    render(<ParentChip name="Salad" />);

    expect(screen.getByText("Salad")).toBeVisible();
  });
});
