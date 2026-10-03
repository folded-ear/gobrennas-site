import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPoller,
  INITIAL_LOOKBACK_MS,
  POLL_INTERVAL_MS,
  POLL_MARGIN_MS,
  PollRequest,
} from "./poller";

const NOW = Date.parse("2026-10-03T12:00:00Z");

function setup(opts: { fail?: boolean } = {}) {
  const requests: (readonly PollRequest[])[] = [];
  const gates: (() => void)[] = [];
  let failing = opts.fail ?? false;
  const poller = createPoller({
    fetchChanges: (batch) => {
      requests.push(batch);
      if (failing) return Promise.reject(new Error("offline"));
      return new Promise<void>((resolve) => gates.push(resolve));
    },
  });
  return {
    poller,
    requests,
    finish: async () => {
      gates.splice(0).forEach((open) => open());
      await vi.advanceTimersByTimeAsync(0);
    },
    setFailing: (v: boolean) => (failing = v),
  };
}

describe("createPoller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("polls a newly tracked plan at once, looking back a while", async () => {
    const { poller, requests } = setup();
    poller.setVisible(true);

    poller.track(["1"]);

    expect(requests).toEqual([
      [{ planId: "1", cutoff: NOW - INITIAL_LOOKBACK_MS }],
    ]);
  });

  it("polls every interval while visible, from just before the last poll", async () => {
    const { poller, requests, finish } = setup();
    poller.setVisible(true);
    poller.track(["1"]);
    await finish();

    vi.advanceTimersByTime(POLL_INTERVAL_MS);
    await finish();

    expect(requests[1]).toEqual([
      { planId: "1", cutoff: NOW - POLL_MARGIN_MS },
    ]);
  });

  it("starts the next cutoff at the start of the poll, not its end", async () => {
    const { poller, requests, finish } = setup();
    poller.setVisible(true);
    poller.track(["1"]);
    vi.setSystemTime(NOW + 3000);
    await finish();

    vi.advanceTimersByTime(POLL_INTERVAL_MS);

    expect(requests[1][0].cutoff).toBe(NOW - POLL_MARGIN_MS);
  });

  it("keeps the old cutoff when a poll fails", async () => {
    const { poller, requests, setFailing, finish } = setup({ fail: true });
    poller.setVisible(true);
    poller.track(["1"]);
    await vi.advanceTimersByTimeAsync(0);
    const first = requests[0][0].cutoff;
    setFailing(false);

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    await finish();

    expect(requests[1][0].cutoff).toBe(first);
  });

  it("never has two polls in flight", async () => {
    const { poller, requests, finish } = setup();
    poller.setVisible(true);
    poller.track(["1"]);

    vi.advanceTimersByTime(POLL_INTERVAL_MS * 3);
    poller.poll();

    expect(requests).toHaveLength(1);
    await finish();
  });

  it("polls a plan tracked mid-poll as soon as that poll ends", async () => {
    const { poller, requests, finish } = setup();
    poller.setVisible(true);
    poller.track(["1"]);

    poller.track(["1", "2"]);
    expect(requests).toHaveLength(1);
    await finish();

    expect(requests[1].map((it) => it.planId)).toEqual(["1", "2"]);
  });

  it("polls only the plans it tracks", async () => {
    const { poller, requests, finish } = setup();
    poller.setVisible(true);
    poller.track(["1", "2"]);
    await finish();

    poller.track(["2"]);
    await finish();
    vi.advanceTimersByTime(POLL_INTERVAL_MS);

    expect(requests.at(-1)!.map((it) => it.planId)).toEqual(["2"]);
  });

  it("stops while hidden and catches up when visible again", async () => {
    const { poller, requests, finish } = setup();
    poller.setVisible(true);
    poller.track(["1"]);
    await finish();
    poller.setVisible(false);

    vi.advanceTimersByTime(POLL_INTERVAL_MS * 4);
    expect(requests).toHaveLength(1);

    poller.setVisible(true);
    expect(requests).toHaveLength(2);
    await finish();
  });

  it("forgets its cutoffs when reset, so the next read is a fresh one", async () => {
    const { poller, requests, finish } = setup();
    poller.setVisible(true);
    poller.track(["1"]);
    await finish();

    poller.reset();
    poller.track(["1"]);

    expect(requests.at(-1)![0].cutoff).toBe(NOW - INITIAL_LOOKBACK_MS);
    await finish();
  });
});
