import { vi } from "vitest";

type Coords = {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracy: number;
};

/** A stand-in for the browser's geolocation, driven by the test. */
export type FakeGeolocation = {
  /** The options of the watch now running, or null when none is. */
  readonly watchOptions: () => PositionOptions | null;
  /** I report a position to the watch now running, taken at ts. */
  report(coords: Coords, ts: number): void;
  /** I answer the pending one-off request with a position, taken at ts. */
  allow(coords: Coords, ts: number): void;
  /** I answer the pending one-off request with a refusal. */
  refuse(): void;
};

function position(coords: Coords, ts: number): GeolocationPosition {
  return {
    timestamp: ts,
    coords: {
      ...coords,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => coords,
    },
    toJSON: () => ({ coords, timestamp: ts }),
  };
}

const PERMISSION_DENIED = 1;

/** I install a fake geolocation on navigator, for the current test. */
export function installFakeGeolocation(): FakeGeolocation {
  let watch: {
    readonly id: number;
    readonly onPosition: PositionCallback;
    readonly options: PositionOptions | undefined;
  } | null = null;
  let request: {
    readonly onPosition: PositionCallback;
    readonly onError: PositionErrorCallback | null;
  } | null = null;
  let lastId = 0;
  vi.stubGlobal("navigator", {
    ...navigator,
    geolocation: {
      watchPosition(
        onPosition: PositionCallback,
        _: unknown,
        options?: PositionOptions,
      ) {
        watch = { id: ++lastId, onPosition, options };
        return watch.id;
      },
      clearWatch(id: number) {
        if (watch?.id === id) watch = null;
      },
      getCurrentPosition(
        onPosition: PositionCallback,
        onError?: PositionErrorCallback,
      ) {
        request = { onPosition, onError: onError ?? null };
      },
    },
  });
  return {
    watchOptions: () => (watch === null ? null : (watch.options ?? {})),
    report(coords, ts) {
      watch?.onPosition(position(coords, ts));
    },
    allow(coords, ts) {
      request?.onPosition(position(coords, ts));
      request = null;
    },
    refuse() {
      request?.onError?.({
        code: PERMISSION_DENIED,
        message: "User denied Geolocation",
        PERMISSION_DENIED,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
      request = null;
    },
  };
}
