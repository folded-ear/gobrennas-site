import { PlanItemStatus } from "@/__generated__/graphql";
import { beforeEach, describe, expect, it } from "vitest";
import { StatusChange } from "./queue";
import { aliasedSender } from "./send";
import { statusApiClient, StatusRequest } from "./test/status-api";
import { readStatus, seededCache, THANKSGIVING } from "./test/status-cache";

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

let cache: ReturnType<typeof seededCache>;
let requests: StatusRequest[];

function clientFor(refuse = false) {
  return statusApiClient(cache, requests, { refuse });
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
    expect(saved).toEqual([true, true]);
    expect(readStatus(cache, "2")?.status).toBe(PlanItemStatus.ACQUIRED);
    expect(readStatus(cache, "3")?.status).toBe(PlanItemStatus.ACQUIRED);
  });

  it("asks the browser to finish a request the page won't wait for", async () => {
    const send = aliasedSender(clientFor());

    await send([PUMPKIN], { keepalive: true });

    expect(requests[0].keepalive).toBe(true);
  });

  it("reports every change unsaved when the server refuses", async () => {
    const send = aliasedSender(clientFor(true));

    const saved = await send([PUMPKIN, CREAM], { keepalive: false });

    expect(saved).toEqual([false, false]);
    expect(readStatus(cache, "2")?.status).toBe(PlanItemStatus.NEEDED);
  });
});
