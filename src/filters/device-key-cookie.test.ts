import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import { COOKIE_DEVICE_KEY, deviceKeyCookieFilter } from "./device-key-cookie";

// The standalone server hands the proxy the address it's bound to as the
// request's URL; only the Host header names the host the browser asked for.
const BOUND_URL = "http://0.0.0.0:3000/shopping";

function mintedCookie(host: string) {
  const request = new NextRequest(BOUND_URL, { headers: { host } });
  const response = deviceKeyCookieFilter(request, () => NextResponse.next());
  return response.cookies.get(COOKIE_DEVICE_KEY);
}

describe("deviceKeyCookieFilter", () => {
  it("scopes a new device key to the domain the browser asked for", () => {
    const cookie = mintedCookie("beta.gobrennas.com");

    expect(cookie?.value).toBeTruthy();
    expect(cookie?.domain).toBe("gobrennas.com");
  });

  it("leaves the port out of the domain", () => {
    expect(mintedCookie("beta.gobrennas.com:8443")?.domain).toBe(
      "gobrennas.com",
    );
  });
});
