import { FilterChain } from "@/filters/filters";
import { requestedHost } from "@/filters/requested-host";
import { NextRequest, NextResponse } from "next/server";

const WWW_PREFIX = "www.";
const HEADER_LOCATION = "location";

export function stripWwwFilter(request: NextRequest, chain: FilterChain) {
  const { host, hostname } = requestedHost(request);
  if (request.method !== "GET" || !hostname.startsWith(WWW_PREFIX)) {
    return chain(request);
  }
  const { pathname, search } = request.nextUrl;
  // scheme-relative, as only the browser knows the scheme it used
  const location = `//${host.slice(WWW_PREFIX.length)}${pathname}${search}`;
  return new NextResponse(null, {
    status: 301,
    headers: { [HEADER_LOCATION]: location },
  });
}
