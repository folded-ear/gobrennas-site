import { render, screen, userEvent } from "@/test";
import { expect, it, vi } from "vitest";
import { RecipeFilter } from "./filter";

it("reports a request to include everyone's recipes", async () => {
  const user = userEvent.setup();
  const onIncludeOthersChange = vi.fn();
  render(
    <RecipeFilter
      query=""
      onQueryChange={vi.fn()}
      includeOthers={false}
      onIncludeOthersChange={onIncludeOthersChange}
    />,
  );

  await user.click(screen.getByRole("switch", { name: "Everyone's Recipes" }));

  expect(onIncludeOthersChange).toHaveBeenCalledWith(true);
});

it("reports a cleared query from its clear button", async () => {
  const user = userEvent.setup();
  const onQueryChange = vi.fn();
  render(
    <RecipeFilter
      query="soup"
      onQueryChange={onQueryChange}
      includeOthers={false}
      onIncludeOthersChange={vi.fn()}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Clear search" }));

  expect(onQueryChange).toHaveBeenCalledWith("");
});

it("reports a cleared query on Escape", async () => {
  const user = userEvent.setup();
  const onQueryChange = vi.fn();
  render(
    <RecipeFilter
      query="soup"
      onQueryChange={onQueryChange}
      includeOthers={false}
      onIncludeOthersChange={vi.fn()}
    />,
  );

  await user.click(screen.getByRole("searchbox", { name: "Search recipes" }));
  await user.keyboard("{Escape}");

  expect(onQueryChange).toHaveBeenCalledWith("");
});
