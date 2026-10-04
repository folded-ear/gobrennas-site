import { usePageEngine } from "@/features/page-engine";
import { render, screen, userEvent, waitFor } from "@/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogOutButton } from "./index";

const { doLogout } = vi.hoisted(() => ({ doLogout: vi.fn() }));

vi.mock("@/constants", () => ({ doLogout }));

/** I make a change the server never answers, so it stays unsent. */
function Renamer() {
  const engine = usePageEngine();
  return (
    <button
      type="button"
      onClick={() =>
        engine.rename({
          kind: "rename",
          id: "3",
          planId: "7",
          name: "Ice cream",
        })
      }
    >
      Rename
    </button>
  );
}

function renderWithChange() {
  render(
    <>
      <Renamer />
      <LogOutButton />
    </>,
  );
}

beforeEach(() => {
  doLogout.mockClear();
});

describe("LogOutButton", () => {
  it("forgets the access token and logs out", async () => {
    localStorage.setItem("accessToken", "a-token");
    render(<LogOutButton />);

    await userEvent.click(screen.getByRole("button", { name: "Log Out" }));

    await waitFor(() => expect(doLogout).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem("accessToken")).toBeNull();
  });

  it("forgets the shopping this device keeps", async () => {
    const deleted = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", { delete: deleted });
    render(<LogOutButton />);

    await userEvent.click(screen.getByRole("button", { name: "Log Out" }));

    await waitFor(() => expect(doLogout).toHaveBeenCalledTimes(1));
    expect(deleted).toHaveBeenCalledWith("shopping-page");
    vi.unstubAllGlobals();
  });

  it("warns before logging out with changes not yet saved", async () => {
    renderWithChange();
    await userEvent.click(screen.getByRole("button", { name: "Rename" }));

    await userEvent.click(screen.getByRole("button", { name: "Log Out" }));

    expect(
      await screen.findByRole("heading", {
        name: "Log out with unsaved changes?",
      }),
    ).toBeVisible();
    expect(doLogout).not.toHaveBeenCalled();
  });

  it("logs out anyway once told to", async () => {
    renderWithChange();
    await userEvent.click(screen.getByRole("button", { name: "Rename" }));
    await userEvent.click(screen.getByRole("button", { name: "Log Out" }));

    await userEvent.click(
      await screen.findByRole("button", { name: "Log out anyway" }),
    );

    await waitFor(() => expect(doLogout).toHaveBeenCalledTimes(1));
  });

  it("stays logged in when the warning is cancelled", async () => {
    renderWithChange();
    await userEvent.click(screen.getByRole("button", { name: "Rename" }));
    await userEvent.click(screen.getByRole("button", { name: "Log Out" }));

    await userEvent.click(
      await screen.findByRole("button", { name: "Cancel" }),
    );

    expect(doLogout).not.toHaveBeenCalled();
  });
});
