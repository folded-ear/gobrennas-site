import { PlanItemStatus } from "@/__generated__/graphql";
import { describe, expect, it } from "vitest";
import {
  POLL_INTERVAL_MS,
  REQUEST_TIMEOUT_MS,
  RETRY_BASE_MS,
  State,
  UNDO_WINDOW_MS,
} from "./state";
import { initialState, step } from "./step";
import { nextWake } from "./wake";

const START = 1_700_000_000_000;

function booted(over: { online?: boolean; visible?: boolean } = {}): State {
  const state = initialState({
    pageLoadId: "page-a",
    userId: null,
    renderedAt: START,
    online: true,
    visible: true,
    ...over,
  });
  return step(state, {
    type: "boot",
    at: START,
    adopted: [],
    restored: null,
    snapshotCurrent: true,
    shoppingCached: true,
  }).state;
}

const after = (state: State, ...events: Parameters<typeof step>[1][]) =>
  events.reduce((it, event) => step(it, event).state, state);

describe("nextWake", () => {
  it("has nothing to wake for when idle", () => {
    expect(nextWake(booted())).toBeNull();
  });

  it("wakes when a held removal's undo window ends", () => {
    const state = after(booted({ online: false }), {
      type: "change",
      at: START,
      hold: true,
      change: {
        kind: "status",
        id: "1",
        planId: "7",
        name: "Pumpkin pie",
        status: PlanItemStatus.COMPLETED,
      },
    });

    expect(nextWake(state)).toBe(START + UNDO_WINDOW_MS);
  });

  it("wakes to give up on a request out too long", () => {
    const state = after(booted(), { type: "watch", at: START, planIds: ["7"] });

    expect(nextWake(state)).toBe(START + REQUEST_TIMEOUT_MS);
  });

  it("wakes for the next poll of a watched plan", () => {
    const watching = after(booted(), {
      type: "watch",
      at: START,
      planIds: ["7"],
    });
    const state = after(watching, {
      type: "polled",
      at: START + 100,
      requestId: watching.inFlight!.id,
      outcome: { kind: "saved", data: { planner: { p0: [] } } },
    });

    expect(nextWake(state)).toBe(START + POLL_INTERVAL_MS);
  });

  it("waits out a backoff before polling again", () => {
    const watching = after(booted(), {
      type: "watch",
      at: START,
      planIds: ["7"],
    });
    const state = after(watching, {
      type: "polled",
      at: START + 100,
      requestId: watching.inFlight!.id,
      outcome: { kind: "unreachable" },
    });

    expect(nextWake(state)).toBe(START + 100 + RETRY_BASE_MS);
  });

  it("doesn't wake to poll while hidden or offline", () => {
    const hidden = after(booted({ visible: false }), {
      type: "watch",
      at: START,
      planIds: ["7"],
    });
    const offline = after(booted({ online: false }), {
      type: "watch",
      at: START,
      planIds: ["7"],
    });

    expect(nextWake(hidden)).toBeNull();
    expect(nextWake(offline)).toBeNull();
  });
});
