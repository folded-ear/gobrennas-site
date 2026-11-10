import { FilterChain } from "@/filters/filters";
import { requestedHost } from "@/filters/requested-host";
import { NextRequest, NextResponse } from "next/server";

const WWW_PREFIX = "www.";
const HEADER_LOCATION = "location";
const HEADER_FORWARDED_PROTO = "x-forwarded-proto";
const SCHEMES = new Set(["http", "https"]);

export function stripWwwFilter(request: NextRequest, chain: FilterChain) {
  const { host, hostname } = requestedHost(request);
  if (request.method !== "GET" || !hostname.startsWith(WWW_PREFIX)) {
    return chain(request);
  }
  const { protocol, pathname, search } = request.nextUrl;
  const forwarded = request.headers.get(HEADER_FORWARDED_PROTO);
  const scheme =
    forwarded !== null && SCHEMES.has(forwarded)
      ? forwarded
      : protocol.slice(0, -1);
  const bareHost = host.slice(WWW_PREFIX.length);
  const location = `${scheme}://${bareHost}${pathname}${search}`;
  return new NextResponse(null, {
    status: 301,
    headers: { [HEADER_LOCATION]: location },
  });
}
