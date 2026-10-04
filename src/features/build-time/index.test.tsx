import { render, screen } from "@/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuildTime } from "./index";

const BUILT_AT = Date.UTC(2026, 9, 3, 21, 46);

afterEach(() => vi.unstubAllEnvs());

describe("BuildTime", () => {
  it("says when the running build was made", () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_ID", String(BUILT_AT));

    render(<BuildTime />);

    const time = screen.getByRole("time");
    expect(time).toHaveAttribute("dateTime", "2026-10-03T21:46:00.000Z");
    expect(time.parentElement).toHaveTextContent(/^Built \S/);
  });

  it("says nothing when the build isn't named by its time", () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "");

    render(<BuildTime />);

    expect(screen.queryByRole("time")).toBeNull();
  });
});
