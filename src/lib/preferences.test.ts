import { describe, expect, it } from "vitest";
import {
  formatBoolean,
  formatIdSet,
  parseBoolean,
  parseIdSet,
} from "./preferences";

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

describe("parseIdSet", () => {
  it("reads a JSON list of ids", () => {
    expect(parseIdSet('["8777749727404","8777749727405"]')).toEqual([
      "8777749727404",
      "8777749727405",
    ]);
  });

  // IDs are big integers, which a hand-written or legacy value may not quote
  it("reads numeric ids as ids", () => {
    expect(parseIdSet("[8777749727404]")).toEqual(["8777749727404"]);
  });

  it("drops repeats, keeping first-seen order", () => {
    expect(parseIdSet('["2","1","2"]')).toEqual(["2", "1"]);
  });

  it.each([
    [undefined],
    [null],
    [""],
    ["   "],
    ["banana"],
    ['{"id":"1"}'],
    ['"1"'],
  ])("reads %o as no ids", (value) => {
    expect(parseIdSet(value)).toEqual([]);
  });

  it("skips entries that aren't ids", () => {
    expect(parseIdSet('["1",null,{},true,"2"]')).toEqual(["1", "2"]);
  });
});

describe("formatIdSet", () => {
  it("writes a JSON list of ids", () => {
    expect(formatIdSet(["2", "1"])).toBe('["2","1"]');
  });

  it("writes what parseIdSet reads back", () => {
    const ids = ["8777749727404", "8777749727405"];
    expect(parseIdSet(formatIdSet(ids))).toEqual(ids);
  });
});
