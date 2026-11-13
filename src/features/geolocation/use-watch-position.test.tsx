import { buildInMemoryCache, render } from "@/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PositionDocument } from "./__generated__/position.generated";
import { installFakeGeolocation } from "./test/fake-geolocation";
import { THROTTLE_MS, useWatchPosition } from "./use-watch-position";

type Cache = ReturnType<typeof buildInMemoryCache>;

const START = Date.parse("2026-11-12T17:30:00.000Z");
const PRODUCE = { latitude: 45.5231, longitude: -122.6765, accuracy: 30 };
const DAIRY = { latitude: 45.5233, longitude: -122.6761, accuracy: 25 };
const CHECKOUT = { latitude: 45.5229, longitude: -122.6763, accuracy: 20 };

function Watcher({ watching }: { readonly watching: boolean }) {
  useWatchPosition(watching);
  return null;
}

function readPosition(cache: Cache) {
  return cache.readQuery({ query: PositionDocument })?.position ?? null;
}

beforeEach(() => {
  vi.useFakeTimers({ now: START });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useWatchPosition", () => {
  it("watches at normal accuracy, and keeps the first position at once", () => {
    const geo = installFakeGeolocation();
    const cache = buildInMemoryCache();
    render(<Watcher watching />, { cache });

    geo.report(PRODUCE, START);

    expect(geo.watchOptions()?.enableHighAccuracy).toBe(false);
    expect(readPosition(cache)).toMatchObject({ ts: START, ...PRODUCE });
  });

  it("keeps only the newest position from each window, at its end", () => {
    const geo = installFakeGeolocation();
    const cache = buildInMemoryCache();
    render(<Watcher watching />, { cache });
    geo.report(PRODUCE, START);

    vi.advanceTimersByTime(5_000);
    geo.report(DAIRY, START + 5_000);
    vi.advanceTimersByTime(5_000);
    geo.report(CHECKOUT, START + 10_000);

    expect(readPosition(cache)).toMatchObject(PRODUCE);
    vi.advanceTimersByTime(THROTTLE_MS - 10_000);
    expect(readPosition(cache)).toMatchObject({
      ts: START + 10_000,
      ...CHECKOUT,
    });
  });

  it("keeps a position at once when the last was kept a window ago", () => {
    const geo = installFakeGeolocation();
    const cache = buildInMemoryCache();
    render(<Watcher watching />, { cache });
    geo.report(PRODUCE, START);

    vi.advanceTimersByTime(THROTTLE_MS);
    geo.report(DAIRY, START + THROTTLE_MS);

    expect(readPosition(cache)).toMatchObject(DAIRY);
  });

  it("doesn't watch while not watching", () => {
    const geo = installFakeGeolocation();
    render(<Watcher watching={false} />);

    expect(geo.watchOptions()).toBeNull();
  });

  it("stops watching when unmounted, keeping the last position", () => {
    const geo = installFakeGeolocation();
    const cache = buildInMemoryCache();
    const { unmount } = render(<Watcher watching />, { cache });
    geo.report(PRODUCE, START);

    unmount();

    expect(geo.watchOptions()).toBeNull();
    expect(readPosition(cache)).toMatchObject(PRODUCE);
  });

  it("keeps a position held for its window when unmounted", () => {
    const geo = installFakeGeolocation();
    const cache = buildInMemoryCache();
    const { unmount } = render(<Watcher watching />, { cache });
    geo.report(PRODUCE, START);
    vi.advanceTimersByTime(5_000);
    geo.report(DAIRY, START + 5_000);

    unmount();
    vi.advanceTimersByTime(THROTTLE_MS);

    expect(readPosition(cache)).toMatchObject(DAIRY);
  });
});
