import { PlanItemStatus } from "@/__generated__/graphql";
import { gql } from "@apollo/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ChangeOutcome,
  CreateChange,
  createChangeQueue,
  PlanChange,
  PlanChangeQueue,
  RenameChange,
  SendOptions,
  SentChange,
  StatusChange,
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
  readonly changes: readonly SentChange[];
  readonly options: SendOptions;
  answer(outcomes: readonly ChangeOutcome[]): void;
};

/** Where the fake server numbers the items it creates from. */
const FIRST_CREATED = 100;

const PIE: StatusChange = {
  kind: "status",
  id: "1",
  planId: THANKSGIVING,
  name: "Pumpkin pie",
  status: PlanItemStatus.DELETED,
};
const PUMPKIN: StatusChange = {
  kind: "status",
  id: "2",
  planId: THANKSGIVING,
  name: "Pumpkin",
  status: PlanItemStatus.ACQUIRED,
};
const CREAM: StatusChange = {
  kind: "status",
  id: "3",
  planId: THANKSGIVING,
  name: "Whipped cream",
  status: PlanItemStatus.ACQUIRED,
};
const SALAD: StatusChange = {
  kind: "status",
  id: "4",
  planId: PICNIC,
  name: "Salad",
  status: PlanItemStatus.ACQUIRED,
};

const PIE_RENAMED: RenameChange = {
  kind: "rename",
  id: "1",
  planId: THANKSGIVING,
  name: "Apple pie",
};
const STUFFING: CreateChange = {
  kind: "create",
  draftId: "d1",
  planId: THANKSGIVING,
  parentId: THANKSGIVING,
  afterId: { id: "1" },
  name: "Stuffing",
};
const GRAVY: CreateChange = {
  kind: "create",
  draftId: "d2",
  planId: THANKSGIVING,
  parentId: THANKSGIVING,
  afterId: { draftId: "d1" },
  name: "Gravy",
};

let cache: ReturnType<typeof seededCache>;
let sent: Sent[];
let failed: PlanChange[][];
let created: number;
let queue: PlanChangeQueue;

beforeEach(() => {
  vi.useFakeTimers();
  cache = seededCache();
  sent = [];
  failed = [];
  created = FIRST_CREATED;
  queue = createChangeQueue({
    cache,
    delayMs: DELAY_MS,
    send: (changes, options) =>
      new Promise((resolve) =>
        sent.push({ changes, options, answer: resolve }),
      ),
    onFailure: (changes) => failed.push([...changes]),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

const CREATED_ITEM = gql`
  fragment ChangeTestCreated on PlanItem {
    id
    name
    status
    parent {
      id
    }
    children {
      id
    }
  }
`;

/** I write what Apollo would from a real response, giving the item's id. */
function writeSaved(change: SentChange): string {
  switch (change.kind) {
    case "status":
      cache.modify({
        id: `PlanItem:${change.id}`,
        fields: { status: () => change.status },
      });
      return change.id;
    case "rename":
      cache.modify({
        id: `PlanItem:${change.id}`,
        fields: { name: () => change.name },
      });
      return change.id;
    case "assignBucket":
      return change.id;
    case "create": {
      const id = String(created++);
      cache.writeFragment({
        fragment: CREATED_ITEM,
        id: `PlanItem:${id}`,
        data: {
          __typename: "PlanItem",
          id,
          name: change.name,
          status: PlanItemStatus.NEEDED,
          parent: { __typename: "Plan", id: change.parentId },
          children: [],
        },
      });
      return id;
    }
  }
}

/** I answer a request as the server would, and let the queue react. */
async function answer(request: Sent, saved = true) {
  request.answer(
    request.changes.map((change) => (saved ? writeSaved(change) : null)),
  );
  await vi.runAllTimersAsync();
}

function pendingNameOf(id: string) {
  return cache.readFragment<{ name: string; pendingName: string | null }>({
    fragment: gql`
      fragment ChangeTestName on PlanItem {
        name
        pendingName @client
      }
    `,
    id: `PlanItem:${id}`,
  });
}

describe("createChangeQueue", () => {
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

  it("sends a rename at once, showing its new name until the server answers", async () => {
    queue.rename(PIE_RENAMED);

    expect(sent.map((it) => it.changes)).toEqual([[PIE_RENAMED]]);
    expect(pendingNameOf("1")).toMatchObject({
      name: "Pumpkin pie",
      pendingName: "Apple pie",
    });

    await answer(sent[0]);

    expect(pendingNameOf("1")).toMatchObject({
      name: "Apple pie",
      pendingName: null,
    });
  });

  it("keeps the old name when a rename is refused, and reports it", async () => {
    queue.rename(PIE_RENAMED);

    await answer(sent[0], false);

    expect(pendingNameOf("1")).toMatchObject({
      name: "Pumpkin pie",
      pendingName: null,
    });
    expect(failed).toEqual([[PIE_RENAMED]]);
  });

  it("lets a later rename of an item replace one still waiting", async () => {
    queue.set([CREAM]);
    queue.rename(PIE_RENAMED);
    queue.rename({ ...PIE_RENAMED, name: "Pecan pie" });

    await answer(sent[0]);

    expect(sent[1].changes).toEqual([{ ...PIE_RENAMED, name: "Pecan pie" }]);
  });

  it("sends renames and status changes together", async () => {
    queue.set([CREAM]);
    queue.rename(PIE_RENAMED);
    queue.set([PUMPKIN]);

    await answer(sent[0]);

    expect(sent[1].changes).toEqual([PIE_RENAMED, PUMPKIN]);
  });

  it("ends a request at a create, sending what follows once it's created", async () => {
    queue.set([CREAM]);
    void queue.create(STUFFING);
    queue.rename(PIE_RENAMED);

    await answer(sent[0]);
    expect(sent[1].changes).toEqual([{ ...STUFFING, afterId: "1" }]);

    await answer(sent[1]);
    expect(sent[2].changes).toEqual([PIE_RENAMED]);
  });

  it("creates an item where it was placed, resolving with its id", async () => {
    const id = queue.create(STUFFING);

    await answer(sent[0]);

    await expect(id).resolves.toBe(String(FIRST_CREATED));
    expect(childIdsOf(cache, THANKSGIVING)).toEqual([
      "1",
      String(FIRST_CREATED),
      "3",
    ]);
  });

  it("creates an item placed after nothing first", async () => {
    void queue.create({ ...STUFFING, afterId: null });

    await answer(sent[0]);

    expect(childIdsOf(cache, THANKSGIVING)).toEqual([
      String(FIRST_CREATED),
      "1",
      "3",
    ]);
  });

  it("places an item after a new one by the new one's real id", async () => {
    void queue.create(STUFFING);
    void queue.create(GRAVY);

    await answer(sent[0]);

    expect(sent[1].changes).toEqual([
      { ...GRAVY, afterId: String(FIRST_CREATED) },
    ]);
  });

  it("fails a create placed after a new one that couldn't be created", async () => {
    const stuffing = queue.create(STUFFING);
    const gravy = queue.create(GRAVY);

    await answer(sent[0], false);

    expect(sent).toHaveLength(1);
    await expect(stuffing).resolves.toBeNull();
    await expect(gravy).resolves.toBeNull();
    expect(failed).toEqual([[STUFFING], [GRAVY]]);
  });

  it("assigns a created item's bucket first, resolving once it's sent", async () => {
    let id: string | null | undefined;
    void queue.create({ ...STUFFING, bucketId: "31" }).then((it) => (id = it));
    queue.rename(PIE_RENAMED);

    await answer(sent[0]);

    expect(id).toBeUndefined();
    expect(sent[1].changes).toEqual([
      {
        kind: "assignBucket",
        id: String(FIRST_CREATED),
        planId: THANKSGIVING,
        name: "Stuffing",
        bucketId: "31",
      },
      PIE_RENAMED,
    ]);

    await answer(sent[1]);

    expect(id).toBe(String(FIRST_CREATED));
  });
});
