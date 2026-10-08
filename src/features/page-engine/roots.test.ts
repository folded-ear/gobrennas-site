import { describe, expect, it } from "vitest";
import { fieldResult } from "./roots";

describe("fieldResult", () => {
  it("finds a field's answer under whichever root it went", () => {
    const data = {
      planner: { s0: { id: "cream" } },
      pantry: { s1: { id: "p2" } },
    };

    expect(fieldResult(data, 0)).toEqual({ id: "cream" });
    expect(fieldResult(data, 1)).toEqual({ id: "p2" });
    expect(fieldResult(data, 2)).toBeUndefined();
  });
});
