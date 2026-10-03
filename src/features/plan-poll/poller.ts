export const POLL_INTERVAL_MS = 15_000;
/** Covers clock skew and a write that commits just after a poll's read. */
export const POLL_MARGIN_MS = 5_000;
/** How far back a plan's first poll looks, as its data's age is unknown. */
export const INITIAL_LOOKBACK_MS = 60_000;

export type PollRequest = { readonly planId: string; readonly cutoff: number };

export type Poller = {
  /** I set the plans I poll; any I wasn't tracking are polled at once. */
  track(planIds: readonly string[]): void;
  /** I poll only while visible, and poll at once on becoming visible. */
  setVisible(visible: boolean): void;
  /** I poll now, unless a poll is already in flight. */
  poll(): void;
  /** I forget what I've polled, so every plan's next poll looks far back. */
  reset(): void;
};

type PollerOptions = {
  /** I send one request for all the plans; I reject if it fails. */
  fetchChanges: (requests: readonly PollRequest[]) => Promise<void>;
};

/**
 * I poll for changes to a set of plans. Each plan's cutoff is when its last
 * successful poll started, less a margin, so polls overlap but leave no gap.
 */
export function createPoller({ fetchChanges }: PollerOptions): Poller {
  let tracked: readonly string[] = [];
  const cutoffs = new Map<string, number>();
  let visible = false;
  let inFlight = false;
  let again = false;
  let generation = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  async function run() {
    if (!visible || tracked.length === 0 || inFlight) return;
    inFlight = true;
    const startedAt = Date.now();
    const started = generation;
    // A first cutoff is kept even if its poll fails, so a retry can't skip
    // the span between the two.
    tracked.forEach((planId) => {
      if (!cutoffs.has(planId)) {
        cutoffs.set(planId, startedAt - INITIAL_LOOKBACK_MS);
      }
    });
    const requests = tracked.map((planId) => ({
      planId,
      cutoff: cutoffs.get(planId)!,
    }));
    try {
      await fetchChanges(requests);
      if (started === generation) {
        requests.forEach(({ planId }) =>
          cutoffs.set(planId, startedAt - POLL_MARGIN_MS),
        );
      }
    } catch {
      // The cutoffs stay put, so the next poll covers this one's span too.
    } finally {
      inFlight = false;
      if (again) {
        again = false;
        void run();
      }
    }
  }

  return {
    track(planIds) {
      const gained = planIds.some((id) => !tracked.includes(id));
      tracked = [...planIds];
      if (!gained) return;
      if (inFlight) again = true;
      else void run();
    },
    setVisible(next) {
      if (next === visible) return;
      visible = next;
      clearInterval(timer);
      if (visible) {
        timer = setInterval(() => void run(), POLL_INTERVAL_MS);
        void run();
      }
    },
    poll() {
      void run();
    },
    reset() {
      generation++;
      cutoffs.clear();
      again = false;
    },
  };
}
