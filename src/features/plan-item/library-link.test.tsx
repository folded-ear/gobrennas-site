import { render, screen } from "@/test";
import { expect, it } from "vitest";
import { LibraryLink } from "./library-link";

it("links to the saved recipe in the library", () => {
  render(<LibraryLink recipeId="saved-pumpkin-pie" />);

  expect(screen.getByRole("link", { name: "Open in Library" })).toHaveAttribute(
    "href",
    "/recipes/saved-pumpkin-pie",
  );
});
