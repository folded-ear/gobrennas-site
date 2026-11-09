import { render, screen } from "@/test";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("NotFound", () => {
  it("says the page wasn't found and links home", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", { name: "Page not found", level: 1 }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
