import { render, screen, userEvent } from "@/test";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CaptureInstallPrompt, InstallApp } from "./index";

const COARSE = "(pointer: coarse)";
const STANDALONE = "(display-mode: standalone)";

const stubEnvironment = (matching: string[], userAgent?: string) => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: matching.includes(query),
    media: query,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  if (userAgent)
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
};

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15";

const fireInstallPrompt = () => {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = Object.assign(
    new Event("beforeinstallprompt", { cancelable: true }),
    {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    },
  );
  act(() => {
    window.dispatchEvent(event);
  });
  return { prompt, event };
};

const renderOffer = () =>
  render(
    <>
      <CaptureInstallPrompt />
      <InstallApp />
    </>,
  );

describe("InstallApp", () => {
  beforeEach(() => stubEnvironment([COARSE]));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("installs through the browser prompt on Android", async () => {
    renderOffer();
    const { prompt, event } = fireInstallPrompt();
    const install = await screen.findByRole("button", { name: "Install app" });

    await userEvent.click(install);

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("shows the Add to Home Screen steps on iOS", async () => {
    stubEnvironment([COARSE], IPHONE_UA);
    renderOffer();

    expect(await screen.findByText(/Add to Home Screen/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Install app" })).toBeNull();
  });

  it("shows nothing on a desktop", () => {
    stubEnvironment([]);
    renderOffer();
    fireInstallPrompt();

    expect(screen.queryByRole("button", { name: "Install app" })).toBeNull();
  });

  it("shows nothing once installed", () => {
    stubEnvironment([COARSE, STANDALONE]);
    renderOffer();
    fireInstallPrompt();

    expect(screen.queryByRole("button", { name: "Install app" })).toBeNull();
  });
});
