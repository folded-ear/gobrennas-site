import type { NextRequest } from "next/server";

const HEADER_HOST = "host";

/**
 * I give the host the browser asked for, as the Host header names it.
 */
export function requestedHost(
  request: NextRequest,
): Pick<URL, "host" | "hostname"> {
  const host = request.headers.get(HEADER_HOST);
  // nextUrl names the address the server is bound to, not the public host
  const url = host === null ? null : URL.parse(`http://${host}`);
  return url ?? request.nextUrl;
}
