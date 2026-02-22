import { NextRequest, NextResponse } from "next/server";

export type FilterChain = (request: NextRequest) => NextResponse;

export type Filter = (request: NextRequest, chain: FilterChain) => NextResponse;

export function buildFilterChain(...filters: Filter[]): FilterChain {
  return (initialRequest) => {
    const l = filters.length;
    const next = (req: NextRequest, i: number): NextResponse => {
      if (i >= l) {
        // out of filters; hand it back to the rest of Next's render pipeline
        return NextResponse.next();
      }
      return filters[i](req, (r) => next(r, i + 1));
    };
    return next(initialRequest, 0);
  };
}
