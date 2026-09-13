import { render, screen } from "@/test";
import { describe, expect, it } from "vitest";
import { CookLink } from "./cook-link";

describe("CookLink", () => {
  it("links to the item's cook view, naming the item", () => {
    render(<CookLink planId="7" itemId="42" name="Pumpkin pie" />);

    expect(
      screen.getByRole("link", { name: "Cook Pumpkin pie" }),
    ).toHaveAttribute("href", "/plan/7/recipe/42");
  });
});
