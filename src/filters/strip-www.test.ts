import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import { stripWwwFilter } from "./strip-www";

// The standalone server hands the proxy the address it's bound to as the
// request's URL; only the Host header names the host the browser asked for.
const BOUND_URL = "http://0.0.0.0:3000/recipe/123?scale=2";

function filter(host: string, method = "GET") {
  const request = new NextRequest(BOUND_URL, { method, headers: { host } });
  const passedOn = NextResponse.next();
  const response = stripWwwFilter(request, () => passedOn);
  return { response, passedOn };
}

describe("stripWwwFilter", () => {
  it("permanently redirects to the same place without the www", () => {
    const { response } = filter("www.gobrennas.com");

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "//gobrennas.com/recipe/123?scale=2",
    );
  });

  it("keeps the port", () => {
    const { response } = filter("www.gobrennas.com:8443");

    expect(response.headers.get("location")).toBe(
      "//gobrennas.com:8443/recipe/123?scale=2",
    );
  });

  it("passes on a host without the www", () => {
    const { response, passedOn } = filter("gobrennas.com");

    expect(response).toBe(passedOn);
  });

  it("passes on a www host that isn't a GET", () => {
    const { response, passedOn } = filter("www.gobrennas.com", "POST");

    expect(response).toBe(passedOn);
  });

  it("passes on a Host that only looks like www", () => {
    const { response, passedOn } = filter("www.@example.com");

    expect(response).toBe(passedOn);
  });
});
