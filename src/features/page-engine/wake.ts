import type { State } from "./state";

/** I give when the engine next has something to do by itself, if ever. */
export function nextWake(state: State): number | null {
  const times: number[] = [];
  for (const entry of state.pending) {
    if (entry.holdUntil !== undefined) times.push(entry.holdUntil);
  }
  if (state.inFlight !== null) {
    if (state.inFlight.abort === null) times.push(state.inFlight.deadline);
  } else if (
    state.lifecycle === "running" &&
    state.online &&
    state.authorized
  ) {
    const sendable = state.pending.some(
      (it) => it.phase === "ready" && it.kept !== "storing",
    );
    if (sendable || state.seedWanted) times.push(state.retryAt);
    if (state.visible && Object.keys(state.watched).length > 0) {
      times.push(Math.max(state.retryAt, state.pollDueAt));
    }
  }
  if (state.jobs.flight !== null) {
    times.push(state.jobs.flight.deadline);
  } else if (
    state.lifecycle === "running" &&
    state.online &&
    state.authorized &&
    state.visible &&
    state.jobs.watchers > 0
  ) {
    times.push(state.jobs.dueAt);
  }
  return times.length === 0 ? null : Math.min(...times);
}
