import { PlanItemStatus } from "@/__generated__/graphql";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStatusQueue,
  SendOptions,
  StatusChange,
  StatusQueue,
} from "./queue";
import {
  childIdsOf,
  PICNIC,
  readStatus,
  seededCache,
  THANKSGIVING,
} from "./test/status-cache";

const DELAY_MS = 4000;

type Sent = {
  readonly changes: readonly StatusChange[];
  readonly options: SendOptions;
  answer(saved: boolean): void;
};

const PIE: StatusChange = {
  id: "1",
  planId: THANKSGIVING,
  name: "Pumpkin pie",
  status: PlanItemStatus.DELETED,
};
const PUMPKIN: StatusChange = {
  id: "2",
  planId: THANKSGIVING,
  name: "Pumpkin",
  status: PlanItemStatus.ACQUIRED,
};
const CREAM: StatusChange = {
  id: "3",
  planId: THANKSGIVING,
  name: "Whipped cream",
  status: PlanItemStatus.ACQUIRED,
};
const SALAD: StatusChange = {
  id: "4",
  planId: PICNIC,
  name: "Salad",
  status: PlanItemStatus.ACQUIRED,
};

let cache: ReturnType<typeof seededCache>;
let sent: Sent[];
let failed: StatusChange[][];
let queue: StatusQueue;

beforeEach(() => {
  vi.useFakeTimers();
  cache = seededCache();
  sent = [];
  failed = [];
  queue = createStatusQueue({
    cache,
    delayMs: DELAY_MS,
    send: (changes, options) =>
      new Promise((resolve) =>
        sent.push({
          changes,
          options,
          answer: (saved) => resolve(changes.map(() => saved)),
        }),
      ),
    onFailure: (changes) => failed.push([...changes]),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

/** I answer a request as the server would, and let the queue react. */
async function answer(request: Sent, saved = true) {
  if (saved) {
    // what Apollo writes from a real response
    for (const change of request.changes) {
      cache.modify({
        id: `PlanItem:${change.id}`,
        fields: { status: () => change.status },
      });
    }
  }
  request.answer(saved);
  await vi.runAllTimersAsync();
}

describe("createStatusQueue", () => {
  it("sends a toggle at once, saving until the server answers", async () => {
    queue.set([CREAM]);

    expect(sent.map((it) => it.changes)).toEqual([[CREAM]]);
    expect(sent[0].options.keepalive).toBe(false);
    expect(readStatus(cache, "3")?.savingStatus).toBe(true);

    await answer(sent[0]);

    expect(readStatus(cache, "3")).toMatchObject({
      status: PlanItemStatus.ACQUIRED,
      savingStatus: false,
    });
  });

  it("holds a plan's changes while its request is in flight, then sends them together", async () => {
    queue.set([CREAM]);
    queue.set([PUMPKIN]);
    queue.set([{ ...CREAM, status: PlanItemStatus.NEEDED }]);

    expect(sent).toHaveLength(1);

    await answer(sent[0]);

    expect(sent.map((it) => it.changes)).toEqual([
      [CREAM],
      [PUMPKIN, { ...CREAM, status: PlanItemStatus.NEEDED }],
    ]);
  });

  it("sends different plans' changes side by side", () => {
    queue.set([CREAM]);
    queue.set([SALAD]);

    expect(sent.map((it) => it.changes)).toEqual([[CREAM], [SALAD]]);
  });

  it("splits one call's changes by plan", () => {
    queue.set([CREAM, SALAD, PUMPKIN]);

    expect(sent.map((it) => it.changes)).toEqual([[CREAM, PUMPKIN], [SALAD]]);
  });

  it("holds a removal until its window closes, marking it pending", async () => {
    queue.hold(PIE);

    expect(readStatus(cache, "1")?.pendingStatus).toBe(PlanItemStatus.DELETED);
    expect(readStatus(cache, "2")?.inert).toBe(true);

    await vi.advanceTimersByTimeAsync(DELAY_MS - 1);
    expect(sent).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(sent.map((it) => it.changes)).toEqual([[PIE]]);
    expect(readStatus(cache, "1")?.savingStatus).toBe(true);
  });

  it("drops a removal cancelled inside its window", async () => {
    queue.hold(PIE);
    queue.cancel(PIE.id);

    await vi.advanceTimersByTimeAsync(DELAY_MS);

    expect(sent).toHaveLength(0);
    expect(readStatus(cache, "1")).toMatchObject({
      pendingStatus: null,
      savingStatus: false,
    });
    expect(readStatus(cache, "2")?.inert).toBe(false);
  });

  it("sends a removal whose window has closed, cancelled or not", async () => {
    queue.hold(PIE);
    await vi.advanceTimersByTimeAsync(DELAY_MS);

    queue.cancel(PIE.id);

    expect(sent.map((it) => it.changes)).toEqual([[PIE]]);
  });

  it("removes a sent removal, and everything below it, from the cache", async () => {
    queue.hold(PIE);
    await vi.advanceTimersByTimeAsync(DELAY_MS);

    await answer(sent[0]);

    expect(readStatus(cache, "1")).toBeNull();
    expect(readStatus(cache, "2")).toBeNull();
    expect(childIdsOf(cache, THANKSGIVING)).toEqual(["3"]);
  });

  it("sends held removals at once on a flush, to outlive the page", () => {
    queue.hold(PIE);

    queue.flush();

    expect(sent.map((it) => it.changes)).toEqual([[PIE]]);
    expect(sent[0].options.keepalive).toBe(true);
  });

  it("sends flushed removals behind a request already in flight", async () => {
    queue.set([CREAM]);
    queue.hold(PIE);

    queue.flush();

    expect(sent).toHaveLength(1);

    await answer(sent[0]);

    expect(sent[1].changes).toEqual([PIE]);
    expect(sent[1].options.keepalive).toBe(true);
  });

  it("restores items the server refused, and reports them", async () => {
    queue.set([CREAM]);
    queue.hold(PIE);
    await vi.advanceTimersByTimeAsync(DELAY_MS);
    await answer(sent[0], false);
    await answer(sent[1], false);

    expect(readStatus(cache, "3")).toMatchObject({
      status: PlanItemStatus.NEEDED,
      savingStatus: false,
    });
    expect(readStatus(cache, "1")).toMatchObject({
      status: PlanItemStatus.NEEDED,
      pendingStatus: null,
      savingStatus: false,
    });
    expect(failed).toEqual([[CREAM], [PIE]]);
  });
});
