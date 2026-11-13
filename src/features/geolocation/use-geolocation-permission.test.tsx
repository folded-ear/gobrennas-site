import { act, render, screen } from "@/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installFakePermission } from "./test/fake-permissions";
import { useGeolocationPermission } from "./use-geolocation-permission";

function Probe() {
  return <p>{useGeolocationPermission() ?? "unknown"}</p>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useGeolocationPermission", () => {
  it("gives the permission once the browser says", async () => {
    installFakePermission("prompt");
    render(<Probe />);

    expect(await screen.findByText("prompt")).toBeInTheDocument();
  });

  it("follows the permission as it changes", async () => {
    const permission = installFakePermission("prompt");
    render(<Probe />);
    await screen.findByText("prompt");

    act(() => permission.set("granted"));

    expect(screen.getByText("granted")).toBeInTheDocument();
  });

  it("gives nothing where the browser can't say", () => {
    vi.stubGlobal("navigator", { ...navigator, permissions: undefined });
    render(<Probe />);

    expect(screen.getByText("unknown")).toBeInTheDocument();
  });
});
