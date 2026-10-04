import { PlanItemStatus } from "@/__generated__/graphql";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PageLocks } from "./locks";
import { createRunner, Runner } from "./runner";
import { ChangeRecord, RETRY_BASE_MS, UNDO_WINDOW_MS } from "./state";
import { fakeApi, FIRST_CREATED_ID } from "./test/fake-api";
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

function start({
  records = [] as readonly ChangeRecord[],
  open = [] as readonly string[],
  userId = ME as string | null,
} = {}) {
  const { store, records: kept } = memoryStore(records);
  const toast = vi.fn();
  runner = createRunner({
    client: api.client,
    pageLoadId: THIS_PAGE,
    userId,
    renderedAt: Date.now(),
    store: userId === null ? null : store,
    locks: fakeLocks(open),
    toast,
    publish: (view) => views.push(view),
  });
  runner.start();
  return { runner, kept, toast };
}

const mutations = () =>
  api.requests.filter((it) => it.operation === "doChanges");

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
