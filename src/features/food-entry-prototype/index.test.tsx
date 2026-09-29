import { render, screen, userEvent } from "@/test";
import { expect, it } from "vitest";
import { FoodEntryPrototype } from "./index";

it("offers a labeled editor, examples, and keyboard guidance without choosing anything implicitly", async () => {
  const user = userEvent.setup();
  render(<FoodEntryPrototype />);
  const editor = screen.getByRole("combobox", { name: "Ingredient" });
  expect(editor).toHaveAttribute("aria-expanded", "false");
  expect(
    screen.getByRole("button", { name: "2 cups chicken st" }),
  ).toBeVisible();
  expect(editor).toHaveAccessibleDescription(/Enter to choose/);
  await user.click(editor);
  await user.keyboard("{Escape}{Tab}");
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(screen.getByText("Prototype controls")).toHaveFocus();
});
