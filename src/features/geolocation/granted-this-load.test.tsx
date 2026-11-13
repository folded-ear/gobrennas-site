import { act, buildInMemoryCache, render, screen, userEvent } from "@/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeolocationPrompt } from "./prompt";
import { installFakeGeolocation } from "./test/fake-geolocation";
import { installFakePermission } from "./test/fake-permissions";
import { useGeolocationPermission } from "./use-geolocation-permission";

const OFFER = "Automatically sort the list for the store you’re at?";
const PRODUCE = { latitude: 45.5231, longitude: -122.6765, accuracy: 30 };

function Shopping() {
  const permission = useGeolocationPermission();
  return (
    <>
      <p>Permission: {permission ?? "unknown"}</p>
      <GeolocationPrompt permission={permission} />
    </>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// Alone in its file: a grant lasts the page load, so it outlives a test.
describe("a position given this page load", () => {
  it("counts as granted while the browser would still ask", async () => {
    installFakePermission("prompt");
    const geo = installFakeGeolocation();
    render(<Shopping />, { cache: buildInMemoryCache() });
    await screen.findByText(OFFER);

    await userEvent.click(screen.getByRole("button", { name: "Use location" }));
    act(() => geo.allow(PRODUCE, Date.now()));

    expect(screen.getByText("Permission: granted")).toBeInTheDocument();
    expect(screen.queryByText(OFFER)).not.toBeInTheDocument();
  });
});
