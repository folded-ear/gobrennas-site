import { describe, expect, it } from "vitest";
import { displayName, isBlankName, UNNAMED } from "./plan-item-name";

describe("isBlankName", () => {
  it("finds nothing blank about a name with words in it", () => {
    expect(isBlankName(" Pumpkin pie ")).toBe(false);
  });

  it("finds an empty name blank", () => {
    expect(isBlankName("")).toBe(true);
  });

  it("finds a whitespace-only name blank", () => {
    expect(isBlankName(" \t ")).toBe(true);
  });
});

describe("displayName", () => {
  it("gives a name as it is", () => {
    expect(displayName("Pumpkin pie")).toBe("Pumpkin pie");
  });

  it("calls a blank name Unnamed", () => {
    expect(displayName("  ")).toBe(UNNAMED);
  });
});
