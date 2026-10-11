"use client";

import { useSyncExternalStore } from "react";

const DENSITY_DIGITS = 3;

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

const size = (width: number, height: number) => `${width} × ${height}`;

const density = () => Number(window.devicePixelRatio.toFixed(DENSITY_DIGITS));

const screenSize = () =>
  `${size(window.screen.width, window.screen.height)} @${density()}x`;

const viewportSize = () => size(window.innerWidth, window.innerHeight);

const unknown = () => null;

/**
 * I give the size of the device's screen and of the viewport within it, in
 * CSS pixels, so I show only once mounted in the browser.
 */
export function DisplaySize() {
  const ofScreen = useSyncExternalStore(subscribe, screenSize, unknown);
  const ofViewport = useSyncExternalStore(subscribe, viewportSize, unknown);
  if (ofScreen === null || ofViewport === null) return null;
  return (
    <>
      <p className="text-sm text-muted">Screen {ofScreen}</p>
      <p className="text-sm text-muted">Viewport {ofViewport}</p>
    </>
  );
}
