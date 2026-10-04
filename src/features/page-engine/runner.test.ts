import { PlanItemStatus } from "@/__generated__/graphql";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PageLocks } from "./locks";
import { createRunner, Runner } from "./runner";
import { ChangeRecord, RETRY_BASE_MS, UNDO_WINDOW_MS } from "./state";
import type { Snapshot } from "./store";
import {
  fakeApi,
  FIRST_CREATED_ID,
  SAVED_NOTES,
  SAVED_PREPARATION,
} from "./test/fake-api";
import { memoryStore } from "./test/memory-store";
import {
  childIdsOf,
  readStatus,
  seededCache,
  THANKSGIVING,
} from "./test/status-cache";
import type { View } from "./view";

const ME = "u1";
const THIS_PAGE = "page-b";

/** I fake Web Locks: page loads in `open` are still open. */
function fakeLocks(open: readonly string[] = []): PageLocks & {
  held: boolean;
} {
  const locks = {
    held: false,
    hold() {
      locks.held = true;
    },
    release() {
      locks.held = false;
    },
    async reacquire() {
      locks.held = true;
    },
    async adopt<T>(pageLoadId: string, work: () => Promise<T>) {
      return open.includes(pageLoadId) ? null : work();
    },
  };
  return locks;
}

let cache: ReturnType<typeof seededCache>;
let api: ReturnType<typeof fakeApi>;
let runner: Runner | undefined;
let views: View[];

const BUILD = "build-1";

/** A snapshot from this build, older than any page, so it's left alone. */
const OLD_SNAPSHOT: Snapshot = {
  userId: ME,
  buildId: BUILD,
  takenAt: 0,
  renderedAt: 0,
  cutoffs: {},
  cache: {},
};

function start({
  records = [] as readonly ChangeRecord[],
  open = [] as readonly string[],
  userId = ME as string | null,
  snapshot = OLD_SNAPSHOT as Snapshot | null,
  renderedAt = Date.now(),
} = {}) {
  const memory = memoryStore(records, snapshot);
  const toast = vi.fn();
  runner = createRunner({
    client: api.client,
    pageLoadId: THIS_PAGE,
    userId,
    renderedAt,
    store: userId === null ? null : memory.store,
    snapshots: userId === null ? null : memory.store,
    buildId: BUILD,
    locks: fakeLocks(open),
    toast,
    publish: (view) => views.push(view),
    worker: null,
  });
  runner.start();
  return { runner, kept: memory.records, memory, toast };
}

const mutations = () =>
  api.requests.filter((it) => it.operation === "doChanges");

/** I give an item as the cache stores it, under no overlay. */
const stored = (from: typeof cache, id: string) =>
  (from.extract() as Record<string, Record<string, unknown>>)[`PlanItem:${id}`];

beforeEach(() => {
  cache = seededCache();
  api = fakeApi(cache);
  views = [];
});

afterEach(() => {
  runner?.stop();
  runner = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the runner", () => {
  it("saves a change and writes what the server answered", async () => {
    const { runner, kept } = start();

    runner.post({
      type: "change",
      change: {
        kind: "status",
        id: "3",
        planId: THANKSGIVING,
        name: "Whipped cream",
        status: PlanItemStatus.ACQUIRED,
      },
    });

    await vi.waitFor(() => expect(mutations()).toHaveLength(1));
    await vi.waitFor(() =>
      expect(readStatus(cache, "3")?.status).toBe(PlanItemStatus.ACQUIRED),
    );
    expect(kept.size).toBe(0);
  });

  it("shows a pending change in the view it publishes", async () => {
    api.mode = "hang";
    const { runner } = start();

    runner.post({
      type: "change",
      change: {
        kind: "rename",
        id: "3",
        planId: THANKSGIVING,
        name: "Ice cream",
      },
    });

    await vi.waitFor(() =>
      expect(views.at(-1)?.name.get("3")).toBe("Ice cream"),
    );
  });

  it("gives a create's real id, and lists the created item", async () => {
    const { runner } = start();

    const id = await runner.create({
      kind: "create",
      id: "draft:s",
      planId: THANKSGIVING,
      parentId: THANKSGIVING,
      afterId: "1",
      name: "Stuffing",
    });

    expect(id).toBe(String(FIRST_CREATED_ID));
    expect(runner.resolve("draft:s")).toBe(id);
    expect(childIdsOf(cache, THANKSGIVING)).toEqual(["1", id, "3"]);
  });

  it("writes all of a renamed item the server answered with", async () => {
    const { runner } = start();

    runner.post({
      type: "change",
      change: {
        kind: "rename",
        id: "3",
        planId: THANKSGIVING,
        name: "Ice cream",
      },
    });

    await vi.waitFor(() =>
      expect(stored(cache, "3")).toMatchObject({
        name: "Ice cream",
        notes: SAVED_NOTES,
        preparation: SAVED_PREPARATION,
        components: [],
      }),
    );
  });

  it("writes all of a created item the server answered with", async () => {
    const { runner } = start();

    const id = await runner.create({
      kind: "create",
      id: "draft:s",
      planId: THANKSGIVING,
      parentId: THANKSGIVING,
      afterId: "1",
      name: "Stuffing",
    });

    expect(stored(cache, id!)).toMatchObject({
      name: "Stuffing",
      notes: SAVED_NOTES,
      preparation: SAVED_PREPARATION,
      components: [],
    });
  });

  it("writes the bucket the server answered with", async () => {
    const { runner } = start();

    runner.post({
      type: "change",
      change: {
        kind: "assignBucket",
        id: "3",
        planId: THANKSGIVING,
        name: "Whipped cream",
        bucketId: "b1",
      },
    });

    await vi.waitFor(() =>
      expect(stored(cache, "3")?.bucket).toEqual({ __ref: "PlanBucket:b1" }),
    );
  });

  it("holds nothing back from the user once it's refused", async () => {
    api.mode = "refuse";
    const { runner, toast } = start();

    runner.post({
      type: "change",
      change: {
        kind: "rename",
        id: "3",
        planId: THANKSGIVING,
        name: "Ice cream",
      },
    });

    await vi.waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
    expect(await runner.unsent()).toBe(0);
  });

  it("keeps a change while unreachable, and sends it when back online", async () => {
    vi.useFakeTimers();
    api.mode = "unreachable";
    const { runner } = start();
    runner.post({
      type: "change",
      change: {
        kind: "rename",
        id: "3",
        planId: THANKSGIVING,
        name: "Ice cream",
      },
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(mutations()).toHaveLength(1);
    expect(await runner.unsent()).toBe(1);

    api.mode = "save";
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);

    expect(mutations()).toHaveLength(2);
    expect(await runner.unsent()).toBe(0);
  });

  it("tries again on its own after backing off", async () => {
    vi.useFakeTimers();
    api.mode = "unreachable";
    const { runner } = start();
    runner.post({
      type: "change",
      change: {
        kind: "rename",
        id: "3",
        planId: THANKSGIVING,
        name: "Ice cream",
      },
    });
    await vi.advanceTimersByTimeAsync(0);
    api.mode = "save";

    await vi.advanceTimersByTimeAsync(RETRY_BASE_MS);

    expect(mutations()).toHaveLength(2);
  });

  it("sends a held removal once its undo window passes", async () => {
    vi.useFakeTimers();
    const { runner } = start();
    runner.post({
      type: "change",
      hold: true,
      change: {
        kind: "status",
        id: "3",
        planId: THANKSGIVING,
        name: "Whipped cream",
        status: PlanItemStatus.COMPLETED,
      },
    });
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS - 1);
    expect(mutations()).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1);

    expect(mutations()).toHaveLength(1);
  });

  it("adopts a closed page's changes and sends them", async () => {
    const { kept } = start({
      records: [
        {
          key: "page-a-1",
          userId: ME,
          pageLoadId: "page-a",
          seq: 1,
          change: {
            kind: "rename",
            id: "3",
            planId: THANKSGIVING,
            name: "Ice cream",
          },
        },
      ],
    });

    await vi.waitFor(() => expect(mutations()).toHaveLength(1));
    expect(mutations()[0].variables).toMatchObject({
      id0: "3",
      name0: "Ice cream",
    });
    await vi.waitFor(() => expect(kept.size).toBe(0));
  });

  it("leaves an open page's changes to it", async () => {
    vi.useFakeTimers();
    const { kept } = start({
      open: ["page-a"],
      records: [
        {
          key: "page-a-1",
          userId: ME,
          pageLoadId: "page-a",
          seq: 1,
          change: {
            kind: "rename",
            id: "3",
            planId: THANKSGIVING,
            name: "Ice cream",
          },
        },
      ],
    });

    await vi.advanceTimersByTimeAsync(1000);

    expect(mutations()).toHaveLength(0);
    expect(kept.get("page-a-1")?.pageLoadId).toBe("page-a");
  });

  it("discards another user's kept changes", async () => {
    vi.useFakeTimers();
    const { kept } = start({
      records: [
        {
          key: "page-a-1",
          userId: "someone-else",
          pageLoadId: "page-a",
          seq: 1,
          change: {
            kind: "rename",
            id: "3",
            planId: THANKSGIVING,
            name: "Ice cream",
          },
        },
      ],
    });

    await vi.advanceTimersByTimeAsync(1000);

    expect(mutations()).toHaveLength(0);
    expect(kept.size).toBe(0);
  });
});

describe("the runner, stopped and started", () => {
  it("fetches shopping again when stopped before its first fetch went", async () => {
    vi.useFakeTimers();
    const { runner } = start({ snapshot: null });
    runner.stop();
    await vi.advanceTimersByTimeAsync(0);
    expect(api.requests.map((it) => it.operation)).not.toContain("Shopping");

    runner.start();
    await vi.advanceTimersByTimeAsync(RETRY_BASE_MS);

    expect(api.requests.map((it) => it.operation)).toContain("Shopping");
  });
});

describe("the runner's snapshot", () => {
  /** I give a cache like this test's, with whipped cream renamed. */
  function renamedCache() {
    const other = seededCache();
    other.modify({
      id: "PlanItem:3",
      fields: { name: () => "Ice cream" },
    });
    return other.extract();
  }

  const nameOf = (id: string) => readStatus(cache, id)?.name;

  it("fetches shopping and snapshots the cache when none is current", async () => {
    const { memory } = start({ snapshot: null });

    await vi.waitFor(() => expect(memory.kept.snapshot).not.toBeNull());
    expect(api.requests.map((it) => it.operation)).toContain("Shopping");
    expect(memory.kept.snapshot).toMatchObject({
      userId: ME,
      buildId: BUILD,
    });
  });

  it("restores a newer snapshot of this user's, from this build", async () => {
    start({
      renderedAt: 1000,
      snapshot: { ...OLD_SNAPSHOT, takenAt: 2000, cache: renamedCache() },
    });

    await vi.waitFor(() => expect(nameOf("3")).toBe("Ice cream"));
  });

  it("leaves the page's data alone for an older snapshot", async () => {
    vi.useFakeTimers();
    start({
      renderedAt: 3000,
      snapshot: { ...OLD_SNAPSHOT, takenAt: 2000, cache: renamedCache() },
    });

    await vi.advanceTimersByTimeAsync(100);

    expect(nameOf("3")).toBe("Whipped cream");
  });

  it("leaves another user's snapshot alone", async () => {
    vi.useFakeTimers();
    start({
      renderedAt: 1000,
      snapshot: {
        ...OLD_SNAPSHOT,
        userId: "someone-else",
        takenAt: 2000,
        cache: renamedCache(),
      },
    });

    await vi.advanceTimersByTimeAsync(100);

    expect(nameOf("3")).toBe("Whipped cream");
  });

  it("forgets the snapshot and the page the worker keeps", async () => {
    const deleted = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", { delete: deleted });
    const { runner, memory } = start();

    await runner.forget();

    expect(memory.kept.snapshot).toBeNull();
    expect(deleted).toHaveBeenCalledWith("shopping-page");
    vi.unstubAllGlobals();
  });
});
