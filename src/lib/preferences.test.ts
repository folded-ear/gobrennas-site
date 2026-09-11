import { describe, expect, it } from "vitest";
import { formatBoolean, parseBoolean } from "./preferences";

describe("parseBoolean", () => {
  it.each([
    ["true", true],
    ["TRUE", true],
    ["t", true],
    ["yes", true],
    ["y", true],
    ["false", false],
    ["False", false],
    ["f", false],
    ["no", false],
    ["n", false],
    [" true ", true],
  ])("reads %o as %o", (value, expected) => {
    expect(parseBoolean(value)).toBe(expected);
  });

  // the schema asks clients to parse generously, calling out numbers
  it.each([
    ["0", false],
    ["1", true],
    ["123", true],
    ["-1", true],
  ])("reads the number %o as %o", (value, expected) => {
    expect(parseBoolean(value)).toBe(expected);
  });

  it.each([[undefined], [null], [""], ["   "], ["banana"]])(
    "reads %o as false",
    (value) => {
      expect(parseBoolean(value)).toBe(false);
    },
  );
});

describe("formatBoolean", () => {
  // what the API stores as a BOOLEAN default, and what the legacy client
  // writes, so the two apps agree on a value either of them set
  it.each([
    [true, "true"],
    [false, "false"],
  ])("writes %o as %o", (value, expected) => {
    expect(formatBoolean(value)).toBe(expected);
  });
});
