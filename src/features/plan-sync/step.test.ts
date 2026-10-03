import { PlanItemStatus } from "@/__generated__/graphql";
import { describe, expect, it } from "vitest";
import {
  Change,
  ChangeRecord,
  CreateChange,
  Effect,
  Event,
  POLL_INTERVAL_MS,
  POLL_MARGIN_MS,
  Posted,
  REQUEST_TIMEOUT_MS,
  RETRY_BASE_MS,
  State,
  UNDO_WINDOW_MS,
} from "./state";
import { initialState, StateInit, step } from "./step";

const START = 1_700_000_000_000;
const RENDERED_AT = START - 3000;
const PLAN = "7";
const PIE = "1";
const CREAM = "3";

const rename = (id: string, name: string): Change => ({
  kind: "rename",
  id,
  planId: PLAN,
  name,
});

const status = (id: string, value: PlanItemStatus): Change => ({
  kind: "status",
  id,
  planId: PLAN,
  name: "Pumpkin pie",
  status: value,
});

const create = (
  id: string,
  over: Partial<CreateChange> = {},
): CreateChange => ({
  kind: "create",
  id,
  planId: PLAN,
  parentId: PLAN,
  afterId: PIE,
  name: "Stuffing",
  ...over,
});

type Sent = Extract<Effect, { kind: "send" }>;
type Polled = Extract<Effect, { kind: "poll" }>;

/** I drive step with events, keeping its state and the latest effects. */
function engine(init: Partial<StateInit> = {}) {
  let state: State = initialState({
    pageLoadId: "page-a",
    userId: "u1",
    renderedAt: RENDERED_AT,
    online: true,
    visible: true,
    ...init,
  });
  let at = START;
  let effects: readonly Effect[] = [];
  const post = (event: Posted) => {
    const result = step(state, { at, ...event } as Event);
    state = result.state;
    effects = result.effects;
    return effects;
  };
  const of = <K extends Effect["kind"]>(kind: K) =>
    effects.filter(
      (it): it is Extract<Effect, { kind: K }> => it.kind === kind,
    );
  return {
    get state() {
      return state;
    },
    get effects() {
      return effects;
    },
    of,
    post,
    advance(ms: number) {
      at += ms;
      return post({ type: "tick" });
    },
    get at() {
      return at;
    },
    boot(adopted: readonly ChangeRecord[] = []) {
      return post({ type: "boot", adopted });
    },
    /** I store whatever the last step asked to store. */
    storeAll() {
      const keys = of("store").flatMap((it) => it.put.map((r) => r.key));
      return post({ type: "stored", keys });
    },
    change(change: Change, hold = false) {
      post({ type: "change", change, hold });
      return this.storeAll();
    },
    lastSend(): Sent {
      const sent = of("send");
      expect(sent).toHaveLength(1);
      return sent[0];
    },
    lastPoll(): Polled {
      const polls = of("poll");
      expect(polls).toHaveLength(1);
      return polls[0];
    },
    answer(sent: Sent, data: Record<string, unknown> = {}) {
      return post({
        type: "sent",
        requestId: sent.requestId,
        outcome: { kind: "saved", data: { planner: data } },
      });
    },
  };
}

const kinds = (effects: readonly Effect[]) => effects.map((it) => it.kind);

describe("sending", () => {
  it("sends nothing before boot", () => {
    const e = engine();
    e.change(rename(PIE, "Apple pie"));

    expect(e.of("send")).toEqual([]);
  });

  it("stores a change, then sends it", () => {
    const e = engine();
    e.boot();

    e.post({ type: "change", change: rename(PIE, "Apple pie") });
    expect(e.of("store")[0].put.map((it) => it.change)).toEqual([
      rename(PIE, "Apple pie"),
    ]);
    expect(e.of("send")).toEqual([]);

    e.storeAll();
    expect(e.lastSend().changes).toEqual([rename(PIE, "Apple pie")]);
  });

  it("sends at once when signed out, as nothing is stored", () => {
    const e = engine({ userId: null });
    e.boot();

    e.post({ type: "change", change: rename(PIE, "Apple pie") });

    expect(e.of("store")).toEqual([]);
    expect(e.lastSend().changes).toEqual([rename(PIE, "Apple pie")]);
  });

  it("has one request out at a time", () => {
    const e = engine();
    e.boot();
    e.change(rename(PIE, "Apple pie"));
    const first = e.lastSend();

    e.change(rename(CREAM, "Ice cream"));
    expect(e.of("send")).toEqual([]);

    e.answer(first, { s0: { id: PIE } });
    expect(e.lastSend().changes).toEqual([rename(CREAM, "Ice cream")]);
  });

  it("sends a newer name in place of one not yet sent", () => {
    const e = engine({ online: false });
    e.boot();
    e.change(rename(PIE, "Apple pie"));
    e.change(rename(PIE, "Cherry pie"));

    e.post({ type: "online" });

    expect(e.lastSend().changes).toEqual([rename(PIE, "Cherry pie")]);
  });

  it("forgets a saved change's record", () => {
    const e = engine();
    e.boot();
    e.post({ type: "change", change: rename(PIE, "Apple pie") });
    const key = e.of("store")[0].put[0].key;
    e.storeAll();

    e.answer(e.lastSend(), { s0: { id: PIE } });

    expect(e.of("store").flatMap((it) => it.remove)).toEqual([key]);
    expect(e.of("writeSaved")).toHaveLength(1);
  });
});

describe("holding removals", () => {
  it("sends a held removal once its undo window passes", () => {
    const e = engine();
    e.boot();
    e.change(status(PIE, PlanItemStatus.COMPLETED), true);
    expect(e.of("send")).toEqual([]);

    e.advance(UNDO_WINDOW_MS);

    expect(e.lastSend().changes).toEqual([
      status(PIE, PlanItemStatus.COMPLETED),
    ]);
  });

  it("sends nothing for a cancelled removal, and forgets it", () => {
    const e = engine();
    e.boot();
    e.post({
      type: "change",
      change: status(PIE, PlanItemStatus.DELETED),
      hold: true,
    });
    const key = e.of("store")[0].put[0].key;
    e.storeAll();

    e.post({ type: "cancel", id: PIE });
    expect(e.of("store").flatMap((it) => it.remove)).toEqual([key]);
    e.advance(UNDO_WINDOW_MS);

    expect(e.of("send")).toEqual([]);
    expect(e.state.pending).toEqual([]);
  });

  it("sends held removals at once, outliving the page, when hidden", () => {
    const e = engine();
    e.boot();
    e.change(status(PIE, PlanItemStatus.COMPLETED), true);

    e.post({ type: "hidden" });

    const sent = e.lastSend();
    expect(sent.changes).toEqual([status(PIE, PlanItemStatus.COMPLETED)]);
    expect(sent.keepalive).toBe(true);
  });
});

describe("creating", () => {
  it("shows a create as a draft, and ends its batch with it", () => {
    const e = engine({ online: false });
    e.boot();
    e.post({ type: "change", change: create("draft:s") });
    expect(e.of("writeDraft").map((it) => it.change)).toEqual([
      create("draft:s"),
    ]);
    e.storeAll();
    e.change(rename("draft:s", "Cornbread stuffing"));

    e.post({ type: "online" });

    expect(e.lastSend().changes).toEqual([create("draft:s")]);
  });

  it("points changes waiting on a create at its real id", () => {
    const e = engine();
    e.boot();
    e.change(create("draft:s"));
    const created = e.lastSend();
    e.change(rename("draft:s", "Cornbread stuffing"));

    e.answer(created, { s0: { id: "900" } });

    expect(e.state.aliases).toEqual({ "draft:s": "900" });
    expect(e.of("created")).toEqual([
      { kind: "created", draftId: "draft:s", id: "900" },
    ]);
    expect(e.lastSend().changes).toEqual([rename("900", "Cornbread stuffing")]);
  });

  it("places a create after a created item by its real id", () => {
    const e = engine();
    e.boot();
    e.change(create("draft:s"));
    const first = e.lastSend();
    e.change(create("draft:g", { afterId: "draft:s", name: "Gravy" }));

    e.answer(first, { s0: { id: "900" } });

    expect(e.lastSend().changes).toEqual([
      create("draft:g", { afterId: "900", name: "Gravy" }),
    ]);
  });

  it("assigns a created item's bucket once it exists", () => {
    const e = engine();
    e.boot();
    e.change(create("draft:s", { bucketId: "b1" }));
    const sent = e.lastSend();
    expect(sent.changes).toEqual([create("draft:s")]);

    e.answer(sent, { s0: { id: "900" } });
    e.storeAll();

    expect(e.lastSend().changes).toEqual([
      {
        kind: "assignBucket",
        id: "900",
        planId: PLAN,
        name: "Stuffing",
        bucketId: "b1",
      },
    ]);
  });

  it("drops what waits on a refused create, and says so", () => {
    const e = engine();
    e.boot();
    e.change(create("draft:s"));
    const created = e.lastSend();
    e.change(rename("draft:s", "Cornbread stuffing"));

    e.post({
      type: "sent",
      requestId: created.requestId,
      outcome: { kind: "refused", fields: [0] },
    });

    expect(e.of("toast")[0].failed).toEqual([
      create("draft:s"),
      rename("draft:s", "Cornbread stuffing"),
    ]);
    expect(e.of("evictDraft")).toEqual([{ kind: "evictDraft", id: "draft:s" }]);
    expect(e.of("created")).toEqual([
      { kind: "created", draftId: "draft:s", id: null },
    ]);
    expect(e.of("send")).toEqual([]);
    expect(e.state.pending).toEqual([]);
  });

  it("refuses a change naming a draft that no create makes", () => {
    const e = engine();
    e.boot();

    e.change(create("draft:g", { afterId: "draft:never" }));

    expect(e.of("send")).toEqual([]);
    expect(e.of("toast")[0].failed).toEqual([
      create("draft:g", { afterId: "draft:never" }),
    ]);
  });
});

describe("answers", () => {
  it("sends again what a refusal didn't name, since nothing saved", () => {
    const e = engine({ online: false });
    e.boot();
    e.change(rename(PIE, "Apple pie"));
    e.change(rename(CREAM, "Ice cream"));
    e.post({ type: "online" });
    const sent = e.lastSend();

    e.post({
      type: "sent",
      requestId: sent.requestId,
      outcome: { kind: "refused", fields: [1] },
    });

    expect(e.of("toast")[0].failed).toEqual([rename(CREAM, "Ice cream")]);
    expect(e.of("writeSaved")).toEqual([]);
    expect(e.lastSend().changes).toEqual([rename(PIE, "Apple pie")]);
  });

  it("refuses the whole batch when no field can be blamed", () => {
    const e = engine();
    e.boot();
    e.change(rename(PIE, "Apple pie"));

    e.post({
      type: "sent",
      requestId: e.lastSend().requestId,
      outcome: { kind: "refused", fields: [] },
    });

    expect(e.of("toast")[0].failed).toEqual([rename(PIE, "Apple pie")]);
    expect(e.state.pending).toEqual([]);
  });

  it("backs off after an unreachable server, then tries again", () => {
    const e = engine();
    e.boot();
    e.change(rename(PIE, "Apple pie"));
    const sent = e.lastSend();

    e.post({
      type: "sent",
      requestId: sent.requestId,
      outcome: { kind: "unreachable" },
    });
    expect(e.of("send")).toEqual([]);
    e.advance(RETRY_BASE_MS - 1);
    expect(e.of("send")).toEqual([]);

    e.advance(1);
    expect(e.lastSend().changes).toEqual([rename(PIE, "Apple pie")]);
  });

  it("gives up on a request that outlives its timeout", () => {
    const e = engine();
    e.boot();
    e.change(rename(PIE, "Apple pie"));

    e.advance(REQUEST_TIMEOUT_MS);

    expect(kinds(e.effects)).toContain("abort");
  });

  it("aborts a request when the connection returns, and resends at once", () => {
    const e = engine();
    e.boot();
    e.change(rename(PIE, "Apple pie"));
    const sent = e.lastSend();

    e.post({ type: "online" });
    expect(kinds(e.effects)).toContain("abort");
    e.post({
      type: "sent",
      requestId: sent.requestId,
      outcome: { kind: "unreachable" },
    });

    expect(e.lastSend().changes).toEqual([rename(PIE, "Apple pie")]);
  });

  it("stops sending once the login has expired", () => {
    const e = engine();
    e.boot();
    e.change(rename(PIE, "Apple pie"));

    e.post({
      type: "sent",
      requestId: e.lastSend().requestId,
      outcome: { kind: "unauthorized" },
    });
    e.advance(RETRY_MAX_SAFE);
    e.change(rename(CREAM, "Ice cream"));

    expect(e.state.authorized).toBe(false);
    expect(e.of("send")).toEqual([]);
    expect(e.state.pending.map((it) => it.phase)).toEqual(["ready", "ready"]);
  });
});

const RETRY_MAX_SAFE = 10 * 60_000;

describe("polling", () => {
  it("polls a newly watched plan at once, from the page's render", () => {
    const e = engine();
    e.boot();

    e.post({ type: "watch", planIds: [PLAN] });

    expect(e.lastPoll().requests).toEqual([
      { planId: PLAN, cutoff: RENDERED_AT - POLL_MARGIN_MS },
    ]);
  });

  it("polls again an interval later, from when the last poll began", () => {
    const e = engine();
    e.boot();
    e.post({ type: "watch", planIds: [PLAN] });
    const startedAt = e.at;
    e.post({
      type: "polled",
      requestId: e.lastPoll().requestId,
      outcome: { kind: "saved", data: { planner: { p0: [] } } },
    });
    expect(e.of("mergePoll")).toHaveLength(1);

    e.advance(POLL_INTERVAL_MS - 1);
    expect(e.of("poll")).toEqual([]);
    e.advance(1);

    expect(e.lastPoll().requests).toEqual([
      { planId: PLAN, cutoff: startedAt - POLL_MARGIN_MS },
    ]);
  });

  it("doesn't poll while hidden, and polls on becoming visible", () => {
    const e = engine({ visible: false });
    e.boot();
    e.post({ type: "watch", planIds: [PLAN] });
    expect(e.of("poll")).toEqual([]);

    e.post({ type: "visible" });

    expect(e.lastPoll().requests.map((it) => it.planId)).toEqual([PLAN]);
  });

  it("keeps showing a saved change until a later poll lands", () => {
    const e = engine();
    e.boot();
    e.post({ type: "watch", planIds: [PLAN] });
    const early = e.lastPoll();
    e.change(rename(PIE, "Apple pie"));
    expect(e.of("send")).toEqual([]);

    e.post({
      type: "polled",
      requestId: early.requestId,
      outcome: { kind: "saved", data: { planner: { p0: [] } } },
    });
    e.answer(e.lastSend(), { s0: { id: PIE } });
    expect(e.state.pending.map((it) => it.phase)).toEqual(["answered"]);

    const later = e.lastPoll();
    e.post({
      type: "polled",
      requestId: later.requestId,
      outcome: { kind: "saved", data: { planner: { p0: [] } } },
    });

    expect(e.state.pending).toEqual([]);
  });

  it("stops polling a plan no screen watches", () => {
    const e = engine();
    e.boot();
    e.post({ type: "watch", planIds: [PLAN] });
    e.post({
      type: "polled",
      requestId: e.lastPoll().requestId,
      outcome: { kind: "saved", data: { planner: { p0: [] } } },
    });

    e.post({ type: "unwatch", planIds: [PLAN] });
    e.advance(POLL_INTERVAL_MS);

    expect(e.of("poll")).toEqual([]);
  });
});

const record = (key: string, seq: number, change: Change): ChangeRecord => ({
  key,
  userId: "u1",
  pageLoadId: "page-a",
  seq,
  change,
});

describe("booting and the bfcache", () => {
  it("sends adopted changes ahead of ones made while booting", () => {
    const e = engine();
    e.change(rename(PIE, "Apple pie"));

    e.boot([record("gone-1", START - 60_000, rename(CREAM, "Ice cream"))]);

    expect(e.lastSend().changes).toEqual([
      rename(CREAM, "Ice cream"),
      rename(PIE, "Apple pie"),
    ]);
  });

  it("lets go while frozen, and sends nothing until restored", () => {
    const e = engine();
    e.boot();

    e.post({ type: "pagehide", persisted: true });
    expect(kinds(e.effects)).toEqual(["freeze"]);
    e.post({ type: "pageshow", persisted: true });
    expect(kinds(e.effects)).toEqual(["thaw"]);
    e.change(rename(PIE, "Apple pie"));
    expect(e.of("send")).toEqual([]);

    e.post({ type: "restored", keys: e.state.pending.map((it) => it.key) });

    expect(e.lastSend().changes).toEqual([rename(PIE, "Apple pie")]);
  });

  it("drops changes another page adopted while it was frozen", () => {
    const e = engine({ online: false });
    e.boot();
    e.change(rename(PIE, "Apple pie"));
    e.post({ type: "pagehide", persisted: true });
    e.post({ type: "pageshow", persisted: true });

    e.post({ type: "restored", keys: [] });
    e.post({ type: "online" });

    expect(e.state.pending).toEqual([]);
    expect(e.of("send")).toEqual([]);
  });

  it("sends without storing once storage is blocked", () => {
    const e = engine();
    e.boot();

    e.post({ type: "storageBlocked" });
    expect(kinds(e.effects)).toEqual(["closeStorage"]);
    e.post({ type: "change", change: rename(PIE, "Apple pie") });

    expect(e.of("store")).toEqual([]);
    expect(e.lastSend().changes).toEqual([rename(PIE, "Apple pie")]);
  });
});
