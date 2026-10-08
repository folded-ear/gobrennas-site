import {
  CombinedGraphQLErrors,
  CombinedProtocolErrors,
  ServerError,
} from "@apollo/client";
import { CHANGE_ROOTS } from "./roots";
import type { PollOutcome, SendOutcome } from "./state";

/** What a request came to: its result, or what it threw. */
export type Answer =
  | { readonly data: unknown; readonly error?: unknown }
  | { readonly thrown: unknown };

type Failure =
  | { readonly kind: "unreachable" }
  | { readonly kind: "unauthorized" }
  | { readonly kind: "refused"; readonly fields: readonly number[] };

/** How the API reports an expired login (see getUserProfile). */
const UNAUTHORIZED_CLASSIFICATION = "UNAUTHORIZED";
const HTTP_UNAUTHORIZED = 401;
const HTTP_SERVER_ERROR = 500;
const ALIASED_FIELD = /^s(\d+)$/;

/** I give the aliased field an error's path names, if it names one. */
function fieldOf(path: readonly (string | number)[] | undefined) {
  const root = path?.[0];
  if (
    !CHANGE_ROOTS.some((it) => it === root) ||
    typeof path?.[1] !== "string"
  ) {
    return;
  }
  const match = ALIASED_FIELD.exec(path[1]);
  return match ? Number(match[1]) : undefined;
}

/** I tell what went wrong, or null when nothing did. */
function failureOf(error: unknown): Failure | null {
  if (error === undefined || error === null) return null;
  if (CombinedGraphQLErrors.is(error)) {
    const { errors } = error;
    if (
      errors.some(
        (it) => it.extensions?.classification === UNAUTHORIZED_CLASSIFICATION,
      )
    ) {
      return { kind: "unauthorized" };
    }
    const fields = errors.map((it) => fieldOf(it.path));
    return {
      kind: "refused",
      fields: fields.includes(undefined)
        ? []
        : [...new Set(fields as number[])],
    };
  }
  if (ServerError.is(error)) {
    if (error.statusCode === HTTP_UNAUTHORIZED) return { kind: "unauthorized" };
    return error.statusCode >= HTTP_SERVER_ERROR
      ? { kind: "unreachable" }
      : { kind: "refused", fields: [] };
  }
  if (CombinedProtocolErrors.is(error)) return { kind: "refused", fields: [] };
  return { kind: "unreachable" };
}

function failureOfAnswer(answer: Answer): Failure | null {
  if ("thrown" in answer) {
    return failureOf(answer.thrown) ?? { kind: "unreachable" };
  }
  return failureOf(answer.error);
}

/** I tell what a send's answer means for its changes. */
export function sendOutcome(answer: Answer): SendOutcome {
  const failure = failureOfAnswer(answer);
  if (failure !== null) return failure;
  return { kind: "saved", data: "data" in answer ? answer.data : null };
}

/** I tell what a poll's answer means. */
export function pollOutcome(answer: Answer): PollOutcome {
  const failure = failureOfAnswer(answer);
  if (failure === null) {
    return { kind: "saved", data: "data" in answer ? answer.data : null };
  }
  return failure.kind === "refused" ? { kind: "refused" } : failure;
}
