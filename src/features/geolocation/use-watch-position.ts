import { useApolloClient } from "@apollo/client/react";
import { useEffect } from "react";
import { PositionDocument } from "./__generated__/position.generated";

/** The least time between positions kept. */
export const THROTTLE_MS = 15_000;

/**
 * I watch the device's position at normal accuracy while watching, keeping
 * the newest in the cache at most once per THROTTLE_MS. What I last kept
 * stays once I stop.
 */
export function useWatchPosition(watching: boolean): void {
  const client = useApolloClient();
  useEffect(() => {
    if (!watching) return;
    const { geolocation } = navigator;
    let keptAt = -Infinity;
    let held: GeolocationPosition | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const keep = (position: GeolocationPosition) => {
      keptAt = Date.now();
      held = null;
      const { latitude, longitude, accuracy } = position.coords;
      client.cache.writeQuery({
        query: PositionDocument,
        data: {
          position: {
            __typename: "Position",
            ts: position.timestamp,
            latitude,
            longitude,
            accuracy,
          },
        },
      });
    };
    const keepHeld = () => {
      timer = undefined;
      if (held !== null) keep(held);
    };
    const id = geolocation.watchPosition(
      (position) => {
        const wait = keptAt + THROTTLE_MS - Date.now();
        if (wait <= 0) {
          keep(position);
          return;
        }
        held = position;
        timer ??= setTimeout(keepHeld, wait);
      },
      // Nothing to do without a position; the last kept one ages out.
      () => {},
      { enableHighAccuracy: false },
    );
    return () => {
      geolocation.clearWatch(id);
      clearTimeout(timer);
      keepHeld();
    };
  }, [client, watching]);
}
