import { FilterChain } from "@/filters/filters";
import { requestedHost } from "@/filters/requested-host";
import { rand_chars } from "@/lib/entropy";
import type { NextRequest } from "next/server";

export const COOKIE_DEVICE_KEY = "FDEVICE";

/** How many of a hostname's trailing labels name the cookie's domain. */
const DOMAIN_LABELS = 2;

export function deviceKeyCookieFilter(
  request: NextRequest,
  chain: FilterChain,
) {
  let deviceKey = request.cookies.get(COOKIE_DEVICE_KEY)?.value;
  if (!deviceKey) {
    // Make a new one and set it into the request to use. It'll get set into the
    // response on the way back out.
    deviceKey = Date.now().toString(36) + "_" + rand_chars(60);
    request.cookies.set(COOKIE_DEVICE_KEY, deviceKey);
  } else if (Math.random() > 0.001) {
    // This is a "forever" cookie, but UAs may choose to expire it before the
    // requested 10 years. So every 1,000 requests or so, renew it below. The
    // rest of the time, take no action.
    return chain(request);
  }

  const response = chain(request);

  const d = new Date();
  d.setFullYear(d.getFullYear() + 10);
  response.cookies.set(COOKIE_DEVICE_KEY, deviceKey, {
    expires: d,
    domain: requestedHost(request)
      .hostname.split(".")
      .slice(-DOMAIN_LABELS)
      .join("."),
    path: "/",
  });
  return response;
}
