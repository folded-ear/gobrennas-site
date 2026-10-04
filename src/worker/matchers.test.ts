import { describe, expect, it } from "vitest";
import {
  isImage,
  isNextStatic,
  isOtherNavigation,
  isRscRequest,
  isShoppingNavigation,
} from "./matchers";

const ORIGIN = "https://beta.gobrennas.test";

const requestFor = (
  path: string,
  init: { mode?: RequestMode; headers?: Record<string, string> } = {},
  origin = ORIGIN,
) => {
  const url = new URL(path, origin);
  const request = {
    mode: init.mode ?? "cors",
    headers: new Headers(init.headers),
  };
  return { request, url, sameOrigin: url.origin === ORIGIN };
};

const navigation = (path: string) => requestFor(path, { mode: "navigate" });

describe("worker matchers", () => {
  it("knows a navigation to shopping from any other", () => {
    expect(isShoppingNavigation(navigation("/shopping"))).toBe(true);
    expect(isShoppingNavigation(navigation("/planner"))).toBe(false);
    expect(isOtherNavigation(navigation("/planner"))).toBe(true);
    expect(isOtherNavigation(navigation("/shopping"))).toBe(false);
  });

  it("doesn't take a data fetch for a navigation", () => {
    const fetched = requestFor("/shopping", { headers: { RSC: "1" } });

    expect(isShoppingNavigation(fetched)).toBe(false);
    expect(isOtherNavigation(fetched)).toBe(false);
  });

  it("knows a Server Components fetch by its header or its query", () => {
    expect(
      isRscRequest(requestFor("/shopping", { headers: { RSC: "1" } })),
    ).toBe(true);
    expect(isRscRequest(requestFor("/shopping?_rsc=abc"))).toBe(true);
    expect(isRscRequest(requestFor("/shopping"))).toBe(false);
  });

  it("knows the site's own built files", () => {
    expect(isNextStatic(requestFor("/_next/static/chunks/app.js"))).toBe(true);
    expect(isNextStatic(requestFor("/icons/icon-192.png"))).toBe(false);
    expect(
      isNextStatic(
        requestFor("/_next/static/chunks/app.js", {}, "https://other.test"),
      ),
    ).toBe(false);
  });

  it("knows a resized image, and a photo on S3", () => {
    expect(isImage(requestFor("/_next/image?url=%2Fa.jpg&w=640&q=75"))).toBe(
      true,
    );
    expect(
      isImage(
        requestFor(
          "/photos/a.jpg",
          {},
          "https://brennas.s3.us-west-2.amazonaws.com",
        ),
      ),
    ).toBe(true);
    expect(isImage(requestFor("/api/thing"))).toBe(false);
  });
});
