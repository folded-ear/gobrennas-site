import { render, screen } from "@/test";
import { expect, it } from "vitest";
import { CookLoading } from "./loading";

it("announces that the planned recipe is loading", () => {
  render(<CookLoading />);
  expect(
    screen.getByRole("status", { name: "Loading planned recipe" }),
  ).toBeVisible();
});
