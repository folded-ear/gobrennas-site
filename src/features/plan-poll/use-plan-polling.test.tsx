import { render } from "@/test";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POLL_INTERVAL_MS } from "./poller";
import { usePlanPolling } from "./use-plan-polling";

const { fetchPlanChanges } = vi.hoisted(() => ({
  fetchPlanChanges: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./fetch", () => ({ fetchPlanChanges }));

function Polling({ planIds }: { planIds: string[] }) {
  usePlanPolling(planIds);
  return null;
}

const polledPlans = () =>
  fetchPlanChanges.mock.calls.map(([, requests]) =>
    requests.map((it: { planId: string }) => it.planId),
  );

describe("usePlanPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchPlanChanges.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("polls the plans on screen at once, then every interval", async () => {
    render(<Polling planIds={["1", "2"]} />);
    await act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS));

    expect(polledPlans()).toEqual([
      ["1", "2"],
      ["1", "2"],
    ]);
  });

  it("stops polling once the screen is gone", async () => {
    const { unmount } = render(<Polling planIds={["1"]} />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    unmount();
    fetchPlanChanges.mockClear();

    await act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3));

    expect(fetchPlanChanges).not.toHaveBeenCalled();
  });

  it("polls a plan selected later", async () => {
    const { rerender } = render(<Polling planIds={["1"]} />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    rerender(<Polling planIds={["1", "2"]} />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(polledPlans().at(-1)).toEqual(["1", "2"]);
  });
});
