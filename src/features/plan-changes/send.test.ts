import { PlanItemStatus } from "@/__generated__/graphql";
import { beforeEach, describe, expect, it } from "vitest";
import { SentChange, StatusChange } from "./queue";
import { aliasedSender } from "./send";
import {
  changeApiClient,
  ChangeRequest,
  FIRST_CREATED_ID,
} from "./test/change-api";
import { readStatus, seededCache, THANKSGIVING } from "./test/status-cache";

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
const EVERY_KIND: readonly SentChange[] = [
  PUMPKIN,
  { kind: "rename", id: "1", planId: THANKSGIVING, name: "Apple pie" },
  {
    kind: "assignBucket",
    id: "3",
    planId: THANKSGIVING,
    name: "Whipped cream",
    bucketId: "31",
  },
  {
    kind: "create",
    draftId: "d1",
    planId: THANKSGIVING,
    parentId: THANKSGIVING,
    afterId: "1",
    name: "Stuffing",
  },
];

let cache: ReturnType<typeof seededCache>;
let requests: ChangeRequest[];

function clientFor(refuse = false) {
  return changeApiClient(cache, requests, { refuse });
}

beforeEach(() => {
  cache = seededCache();
  requests = [];
});

describe("aliasedSender", () => {
  it("sends a plan's changes as one request", async () => {
    const send = aliasedSender(clientFor());

    const saved = await send([PUMPKIN, CREAM], { keepalive: false });

    expect(requests).toHaveLength(1);
    expect(saved).toEqual(["2", "3"]);
    expect(readStatus(cache, "2")?.status).toBe(PlanItemStatus.ACQUIRED);
    expect(readStatus(cache, "3")?.status).toBe(PlanItemStatus.ACQUIRED);
  });

  it("sends every kind of change together, giving each one's item", async () => {
    const send = aliasedSender(clientFor());

    const saved = await send(EVERY_KIND, { keepalive: false });

    expect(requests).toHaveLength(1);
    expect(requests[0].variables).toMatchObject({
      id0: "2",
      status0: PlanItemStatus.ACQUIRED,
      id1: "1",
      name1: "Apple pie",
      id2: "3",
      bucketId2: "31",
      parentId3: THANKSGIVING,
      afterId3: "1",
      name3: "Stuffing",
    });
    expect(saved).toEqual(["2", "1", "3", String(FIRST_CREATED_ID)]);
    expect(readStatus(cache, "1")?.name).toBe("Apple pie");
    expect(readStatus(cache, String(FIRST_CREATED_ID))?.name).toBe("Stuffing");
  });

  it("asks the browser to finish a request the page won't wait for", async () => {
    const send = aliasedSender(clientFor());

    await send([PUMPKIN], { keepalive: true });

    expect(requests[0].keepalive).toBe(true);
  });

  it("reports every change unsaved when the server refuses", async () => {
    const send = aliasedSender(clientFor(true));

    const saved = await send(EVERY_KIND, { keepalive: false });

    expect(saved).toEqual([null, null, null, null]);
    expect(readStatus(cache, "2")?.status).toBe(PlanItemStatus.NEEDED);
  });
});
