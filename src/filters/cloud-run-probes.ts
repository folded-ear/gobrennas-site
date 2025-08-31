import { FilterChain } from "@/filters/filters";
import { NextRequest, NextResponse } from "next/server";

export function cloudRunProbesFilter(request: NextRequest, chain: FilterChain) {
  if (request.nextUrl.pathname.startsWith("/_probes/")) {
    return new NextResponse("Happy Cooking!", {
      headers: { "content-type": "text/plain" },
    });
  }
  return chain(request);
}
