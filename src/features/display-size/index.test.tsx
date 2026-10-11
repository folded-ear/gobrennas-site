import { render, screen } from "@/test";
import { act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DisplaySize } from "./index";

const stubScreen = (width: number, height: number, density: number) => {
  vi.spyOn(window.screen, "width", "get").mockReturnValue(width);
  vi.spyOn(window.screen, "height", "get").mockReturnValue(height);
  vi.stubGlobal("devicePixelRatio", density);
};

const stubViewport = (width: number, height: number) => {
  vi.stubGlobal("innerWidth", width);
  vi.stubGlobal("innerHeight", height);
};

describe("DisplaySize", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("gives the screen's size and pixel density", () => {
    stubScreen(393, 852, 3);

    render(<DisplaySize />);

    expect(screen.getByText("Screen 393 × 852 @3x")).toBeInTheDocument();
  });

  it("trims float noise from the pixel density", () => {
    stubScreen(1728, 1117, 1.100000023841858);

    render(<DisplaySize />);

    expect(screen.getByText("Screen 1728 × 1117 @1.1x")).toBeInTheDocument();
  });

  it("gives the viewport's size", () => {
    stubViewport(393, 659);

    render(<DisplaySize />);

    expect(screen.getByText("Viewport 393 × 659")).toBeInTheDocument();
  });

  it("follows the viewport as it resizes", () => {
    stubViewport(393, 659);
    render(<DisplaySize />);

    stubViewport(852, 337);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(screen.getByText("Viewport 852 × 337")).toBeInTheDocument();
  });
});
