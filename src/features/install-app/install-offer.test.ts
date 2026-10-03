import { describe, expect, it } from "vitest";
import { installOffer } from "./install-offer";

const PHONE = { coarse: true, standalone: false, ios: false, canPrompt: false };

describe("installOffer", () => {
  it("offers the browser prompt where one was captured", () => {
    expect(installOffer({ ...PHONE, canPrompt: true })).toBe("prompt");
  });

  it("shows the Add to Home Screen steps on iOS", () => {
    expect(installOffer({ ...PHONE, ios: true })).toBe("ios");
  });

  it("offers nothing on a device with no way to install", () => {
    expect(installOffer(PHONE)).toBe("none");
  });

  it("offers nothing on a desktop, even with a captured prompt", () => {
    expect(installOffer({ ...PHONE, coarse: false, canPrompt: true })).toBe(
      "none",
    );
  });

  it("offers nothing once the app is installed", () => {
    expect(installOffer({ ...PHONE, standalone: true, ios: true })).toBe(
      "none",
    );
  });
});
