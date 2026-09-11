import "@testing-library/jest-dom/vitest";

import { toast } from "@heroui/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";

expect.extend(matchers);

// jsdom doesn't implement ResizeObserver; components like HeroUI's
// ScrollShadow use it to detect overflow.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

// jsdom doesn't implement matchMedia; next-themes reads it to follow the
// system colour scheme.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

afterEach(() => {
  cleanup();
  // The toast queue is module-global, so a toast would outlive its test.
  toast.clear();
});
