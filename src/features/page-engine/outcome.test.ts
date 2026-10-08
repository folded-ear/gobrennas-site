import {
  CombinedGraphQLErrors,
  CombinedProtocolErrors,
  ServerError,
} from "@apollo/client";
import { describe, expect, it } from "vitest";
import { pollOutcome, sendOutcome } from "./outcome";

const DATA = { planner: { s0: { id: "1" } } };

const graphqlErrors = (
  ...errors: { path?: (string | number)[]; classification?: string }[]
) =>
  new CombinedGraphQLErrors({
    data: null,
    errors: errors.map(({ path, classification }) => ({
      message: "Nope",
      ...(path ? { path } : {}),
      ...(classification ? { extensions: { classification } } : {}),
    })),
  });

const serverError = (status: number) =>
  new ServerError("Failed", {
    response: new Response("", { status }),
    bodyText: "",
  });

describe("sendOutcome", () => {
  it("saves a batch with no errors", () => {
    expect(sendOutcome({ data: DATA })).toEqual({ kind: "saved", data: DATA });
  });

  it("blames the fields that errored", () => {
    const error = graphqlErrors(
      { path: ["planner", "s2"] },
      { path: ["planner", "s0", "id"] },
    );

    expect(sendOutcome({ data: null, error })).toEqual({
      kind: "refused",
      fields: [2, 0],
    });
  });

  it("blames a field under pantry as it does one under planner", () => {
    const error = graphqlErrors({ path: ["pantry", "s1"] });

    expect(sendOutcome({ data: null, error })).toEqual({
      kind: "refused",
      fields: [1],
    });
  });

  it("blames no field when an error names none", () => {
    const error = graphqlErrors({ path: ["planner", "s1"] }, {});

    expect(sendOutcome({ data: null, error })).toEqual({
      kind: "refused",
      fields: [],
    });
  });

  it("knows an expired login, whichever field reports it", () => {
    const error = graphqlErrors(
      { path: ["planner", "s0"] },
      { path: ["planner", "s1"], classification: "UNAUTHORIZED" },
    );

    expect(sendOutcome({ data: null, error })).toEqual({
      kind: "unauthorized",
    });
    expect(sendOutcome({ thrown: serverError(401) })).toEqual({
      kind: "unauthorized",
    });
  });

  it("tries again after a network failure or a server error", () => {
    expect(sendOutcome({ thrown: new TypeError("Failed to fetch") })).toEqual({
      kind: "unreachable",
    });
    expect(
      sendOutcome({ thrown: new DOMException("Aborted", "AbortError") }),
    ).toEqual({ kind: "unreachable" });
    expect(sendOutcome({ thrown: serverError(503) })).toEqual({
      kind: "unreachable",
    });
  });

  it("refuses a batch the server rejected outright", () => {
    expect(sendOutcome({ thrown: serverError(400) })).toEqual({
      kind: "refused",
      fields: [],
    });
    expect(
      sendOutcome({
        data: null,
        error: new CombinedProtocolErrors([{ message: "Nope" }]),
      }),
    ).toEqual({ kind: "refused", fields: [] });
  });
});

describe("pollOutcome", () => {
  it("gives a clean poll's data", () => {
    expect(pollOutcome({ data: DATA })).toEqual({ kind: "saved", data: DATA });
  });

  it("tells failures apart as sends do", () => {
    expect(
      pollOutcome({
        data: null,
        error: graphqlErrors({ classification: "UNAUTHORIZED" }),
      }),
    ).toEqual({ kind: "unauthorized" });
    expect(pollOutcome({ thrown: new TypeError("Failed to fetch") })).toEqual({
      kind: "unreachable",
    });
    expect(pollOutcome({ data: null, error: graphqlErrors({}) })).toEqual({
      kind: "refused",
    });
  });
});
