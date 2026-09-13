import { render, screen, within } from "@/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SectionNav } from "./index";

let pathname = "/planner";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

beforeEach(() => {
  pathname = "/planner";
});

function nav() {
  return screen.getByRole("navigation", { name: "Sections" });
}

function current() {
  return within(nav())
    .getAllByRole("link")
    .filter((it) => it.getAttribute("aria-current") === "page");
}

describe("SectionNav", () => {
  it("offers every section, in order", () => {
    render(<SectionNav />);

    const links = within(nav()).getAllByRole("link");
    expect(links.map((it) => it.getAttribute("href"))).toEqual([
      "/recipes",
      "/planner",
      "/shopping",
      "/profile",
    ]);
    expect(within(nav()).getByRole("link", { name: "Library" })).toBeVisible();
    expect(within(nav()).getByRole("link", { name: "Planner" })).toBeVisible();
    expect(within(nav()).getByRole("link", { name: "Shopping" })).toBeVisible();
    expect(within(nav()).getByRole("link", { name: "Profile" })).toBeVisible();
  });

  it.each([
    ["/recipes", "Library"],
    ["/recipes/8777749727405", "Library"],
    ["/recipes/saved", "Library"],
    ["/planner", "Planner"],
    ["/plan/8777749727404/recipe/8777749727405", "Planner"],
    ["/shopping", "Shopping"],
    ["/profile", "Profile"],
  ])("marks %s as in %s", (path, section) => {
    pathname = path;

    render(<SectionNav />);

    expect(current().map((it) => it.textContent)).toEqual([section]);
  });

  it("marks no section off every section's paths", () => {
    pathname = "/pantry";

    render(<SectionNav />);

    expect(current()).toEqual([]);
  });
});
