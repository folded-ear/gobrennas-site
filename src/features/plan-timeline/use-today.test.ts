import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useToday } from "./use-today";

afterEach(() => {
  vi.useRealTimers();
});

describe("useToday", () => {
  it("reads the local calendar date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 9, 23, 30));

    const { result } = renderHook(() => useToday());

    expect(result.current).toBe("2026-09-09");
  });

  it("holds its value once mounted, so a re-render can't shift the anchor", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 9, 23, 59));

    const { result, rerender } = renderHook(() => useToday());
    vi.setSystemTime(new Date(2026, 8, 10, 0, 1));
    rerender();

    expect(result.current).toBe("2026-09-09");
  });
});
