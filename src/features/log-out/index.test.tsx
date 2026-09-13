import { render, screen, userEvent } from "@/test";
import { describe, expect, it, vi } from "vitest";
import { LogOutButton } from "./index";

const { doLogout } = vi.hoisted(() => ({ doLogout: vi.fn() }));

vi.mock("@/constants", () => ({ doLogout }));

describe("LogOutButton", () => {
  it("forgets the access token and logs out", async () => {
    localStorage.setItem("accessToken", "a-token");
    render(<LogOutButton />);

    await userEvent.click(screen.getByRole("button", { name: "Log Out" }));

    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(doLogout).toHaveBeenCalledTimes(1);
  });
});
