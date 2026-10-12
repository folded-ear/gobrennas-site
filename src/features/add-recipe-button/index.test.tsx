import { ADD_RECIPE_PATH } from "@/lib/routes";
import { render, screen, userEvent, within } from "@/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddRecipeButton } from "./index";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  push.mockReset();
});

async function openMenu() {
  await userEvent.click(
    screen.getByRole("button", { name: "More ways to add a recipe" }),
  );
  return screen.findByRole("menu", { name: "More ways to add a recipe" });
}

describe("AddRecipeButton", () => {
  it("links to the add form, named for what it does", () => {
    render(<AddRecipeButton onAddFromPhoto={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Add Recipe" })).toHaveAttribute(
      "href",
      ADD_RECIPE_PATH,
    );
  });

  it("offers a blank recipe or one from a photo in its menu", async () => {
    render(<AddRecipeButton onAddFromPhoto={vi.fn()} />);

    const menu = await openMenu();

    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((it) => it.textContent),
    ).toEqual(["Add Recipe", "Add From Photo"]);
  });

  it("goes to the add form for a blank recipe", async () => {
    const onAddFromPhoto = vi.fn();
    render(<AddRecipeButton onAddFromPhoto={onAddFromPhoto} />);

    await userEvent.click(
      within(await openMenu()).getByRole("menuitem", { name: "Add Recipe" }),
    );

    expect(push).toHaveBeenCalledExactlyOnceWith(ADD_RECIPE_PATH);
    expect(onAddFromPhoto).not.toHaveBeenCalled();
  });

  it("says when a recipe from a photo is asked for", async () => {
    const onAddFromPhoto = vi.fn();
    render(<AddRecipeButton onAddFromPhoto={onAddFromPhoto} />);

    await userEvent.click(
      within(await openMenu()).getByRole("menuitem", {
        name: "Add From Photo",
      }),
    );

    expect(onAddFromPhoto).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });
});
