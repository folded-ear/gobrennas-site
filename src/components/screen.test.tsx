import { useHistoryState } from "@/hooks/use-history-state";
import { render, screen, userEvent, waitFor, within } from "@/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Screen, useBlockScreenEscape } from "./screen";

const back = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back }),
}));

const PHOTOS_KEY = "photos";

beforeEach(() => {
  back.mockReset();
  window.history.replaceState(null, "");
});

function EscapeBlocker({ isBlocked }: { isBlocked: boolean }) {
  useBlockScreenEscape(isBlocked);
  return <p>Roast the pumpkin first.</p>;
}

/** An editor screen that opens a second screen from inside itself. */
function Editor() {
  const photos = useHistoryState<true>(PHOTOS_KEY);
  return (
    <Screen label="Add Recipe">
      <label>
        Title
        <input />
      </label>
      <button type="button" onClick={() => photos.push(true)}>
        Photos
      </button>
      <Screen label="Photos" isOpen={photos.value === true}>
        <p>Choose a photo of the recipe.</p>
      </Screen>
    </Screen>
  );
}

describe("Screen", () => {
  it.each([undefined, "wide", "compact"] as const)(
    "should apply the %s width while keeping full mobile width",
    (size) => {
      render(
        <Screen label="Plan settings" size={size}>
          <p>Edit your plan.</p>
        </Screen>,
      );

      const dialog = screen.getByRole("dialog", { name: "Plan settings" });
      expect(dialog).toHaveClass("w-full", "max-w-none");
      expect(dialog).toHaveClass(
        size === "compact" ? "sm:max-w-lg" : "sm:max-w-[90vw]",
      );
      expect(dialog).not.toHaveClass(
        size === "compact" ? "sm:max-w-[90vw]" : "sm:max-w-lg",
      );
    },
  );

  it("shows its content as a named dialog", () => {
    render(
      <Screen label="Pumpkin pie">
        <p>Roast the pumpkin first.</p>
      </Screen>,
    );

    const dialog = screen.getByRole("dialog", { name: "Pumpkin pie" });
    expect(dialog).toHaveTextContent("Roast the pumpkin first.");
  });

  it("keeps its header in view, out of the content that scrolls", () => {
    render(
      <Screen label="Pumpkin pie" header={<h2>Pumpkin pie</h2>}>
        <p>Roast the pumpkin first.</p>
      </Screen>,
    );

    const heading = screen.getByRole("heading", { name: "Pumpkin pie" });
    const scrolling = screen
      .getByText("Roast the pumpkin first.")
      .closest('[data-slot="drawer-body"]');
    expect(screen.getByRole("dialog")).toContainElement(heading);
    expect(scrolling).not.toBeNull();
    expect(scrolling).not.toContainElement(heading);
  });

  it("shows nothing while closed", () => {
    render(
      <Screen label="Pumpkin pie" isOpen={false}>
        <p>Roast the pumpkin first.</p>
      </Screen>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("goes back when closed", async () => {
    render(
      <Screen label="Pumpkin pie">
        <p>Roast the pumpkin first.</p>
      </Screen>,
    );

    await userEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(back).toHaveBeenCalledTimes(1);
  });

  it("goes back on Escape", async () => {
    render(
      <Screen label="Pumpkin pie">
        <p>Roast the pumpkin first.</p>
      </Screen>,
    );

    await userEvent.keyboard("{Escape}");

    expect(back).toHaveBeenCalledTimes(1);
  });

  it("stays open on Escape while something inside blocks it", async () => {
    render(
      <Screen label="Pumpkin pie">
        <EscapeBlocker isBlocked />
      </Screen>,
    );

    await userEvent.keyboard("{Escape}");

    expect(back).not.toHaveBeenCalled();
  });

  it("goes back on Escape once nothing inside blocks it", async () => {
    const { rerender } = render(
      <Screen label="Pumpkin pie">
        <EscapeBlocker isBlocked />
      </Screen>,
    );

    rerender(
      <Screen label="Pumpkin pie">
        <EscapeBlocker isBlocked={false} />
      </Screen>,
    );
    await userEvent.keyboard("{Escape}");

    expect(back).toHaveBeenCalledTimes(1);
  });
});

describe("a Screen opened from inside another", () => {
  beforeEach(() => {
    back.mockImplementation(() => window.history.back());
  });

  async function openPhotosOver(title: string) {
    render(<Editor />);
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), title);
    await userEvent.click(screen.getByRole("button", { name: "Photos" }));
    return screen.findByRole("dialog", { name: "Photos" });
  }

  async function expectOnlyTheEditor(title: string) {
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Photos" })).toBeNull(),
    );
    const editor = screen.getByRole("dialog", { name: "Add Recipe" });
    expect(within(editor).getByRole("textbox", { name: "Title" })).toHaveValue(
      title,
    );
  }

  it("shows as its own named dialog", async () => {
    const photos = await openPhotosOver("Pumpkin pie");

    expect(photos).toHaveTextContent("Choose a photo of the recipe.");
  });

  it("alone closes on Escape, leaving the first as it was", async () => {
    await openPhotosOver("Pumpkin pie");

    await userEvent.keyboard("{Escape}");

    expect(back).toHaveBeenCalledTimes(1);
    await expectOnlyTheEditor("Pumpkin pie");
  });

  it("alone closes by its close button, leaving the first as it was", async () => {
    const photos = await openPhotosOver("Pumpkin pie");

    await userEvent.click(
      within(photos).getByRole("button", { name: /close/i }),
    );

    expect(back).toHaveBeenCalledTimes(1);
    await expectOnlyTheEditor("Pumpkin pie");
  });
});
