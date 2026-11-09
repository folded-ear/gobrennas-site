import {
  buildInMemoryCache,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test";
import { Suspense } from "react";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { GetRecipeDetailDocument } from "./__generated__/getRecipeDetail.generated";
import { RecipeDetail } from "./index";
import { borrowedRecipe, planner, recipe } from "./test/recipe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), back: vi.fn(), push: vi.fn() }),
}));

const shareUrl = `${window.location.origin}/share/recipe/apple-pie/0f1e2d3c/pie`;

function show(value = recipe) {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: GetRecipeDetailDocument,
    variables: { id: "pie" },
    data: {
      library: { __typename: "LibraryQuery", getRecipeById: value },
      planner,
    },
  });
  render(
    <Suspense>
      <RecipeDetail id="pie" />
    </Suspense>,
    { cache },
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function chooseSharing(user: User) {
  await user.click(screen.getByRole("button", { name: "More recipe actions" }));
  await user.click(screen.getByRole("menuitem", { name: "Share recipe" }));
}

/** I share on a device without a share sheet, which shows the link. */
async function openSharing(user: User) {
  await chooseSharing(user);
  return screen.findByRole("dialog", { name: "Share recipe" });
}

function deviceSharing() {
  const share = vi.fn<(data: ShareData) => Promise<void>>();
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
  onTestFinished(() => {
    Reflect.deleteProperty(navigator, "share");
  });
  return share;
}

describe("sharing a recipe", () => {
  it.each([
    [recipe, ["Duplicate", "Edit recipe", "Share recipe", "Delete recipe"]],
    [borrowedRecipe, ["Copy to my library", "Share recipe"]],
  ])(
    "comes last among the everyday actions (mine: $mine)",
    async (value, actions) => {
      const user = userEvent.setup();
      show(value);
      await user.click(
        screen.getByRole("button", { name: "More recipe actions" }),
      );
      expect(
        screen.getAllByRole("menuitem").map((item) => item.textContent),
      ).toEqual(actions);
    },
  );

  it("shows the recipe's share link, selected and ready to copy", async () => {
    const user = userEvent.setup();
    show();
    const dialog = await openSharing(user);
    const link = within(dialog).getByRole<HTMLInputElement>("textbox", {
      name: "Share link",
    });
    expect(link).toHaveValue(shareUrl);
    expect(link).toHaveAttribute("readonly");
    await waitFor(() => expect(link).toHaveFocus());
    expect([link.selectionStart, link.selectionEnd]).toEqual([
      0,
      shareUrl.length,
    ]);
  });

  it("copies the share link and closes", async () => {
    const user = userEvent.setup();
    show();
    const dialog = await openSharing(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Copy & Close" }),
    );
    expect(await navigator.clipboard.readText()).toBe(shareUrl);
    expect(await screen.findByText("Link copied")).toBeVisible();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("says so when the share link can't be copied", async () => {
    const user = userEvent.setup();
    show();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
      new DOMException("Denied", "NotAllowedError"),
    );
    const dialog = await openSharing(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Copy & Close" }),
    );
    expect(await screen.findByText("Couldn’t copy link")).toBeVisible();
    expect(dialog).toBeVisible();
  });

  it("hands the share link to the device's share sheet instead", async () => {
    const share = deviceSharing().mockResolvedValue();
    const user = userEvent.setup();
    show();
    await chooseSharing(user);
    expect(share).toHaveBeenCalledWith({ title: "Apple pie", url: shareUrl });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does nothing more when the share sheet is dismissed", async () => {
    deviceSharing().mockRejectedValue(
      new DOMException("Dismissed", "AbortError"),
    );
    const user = userEvent.setup();
    show();
    await chooseSharing(user);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the share link when the share sheet fails", async () => {
    deviceSharing().mockRejectedValue(
      new DOMException("Denied", "NotAllowedError"),
    );
    const user = userEvent.setup();
    show();
    await chooseSharing(user);
    const dialog = await screen.findByRole("dialog", { name: "Share recipe" });
    expect(
      within(dialog).getByRole("textbox", { name: "Share link" }),
    ).toHaveValue(shareUrl);
  });

  it("closes and returns focus to its trigger", async () => {
    const user = userEvent.setup();
    show();
    const dialog = await openSharing(user);
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "More recipe actions" }),
      ).toHaveFocus(),
    );
  });
});
