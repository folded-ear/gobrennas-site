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
