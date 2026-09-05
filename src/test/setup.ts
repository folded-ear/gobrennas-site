import "@testing-library/jest-dom/vitest";

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

afterEach(() => {
  cleanup();
});
