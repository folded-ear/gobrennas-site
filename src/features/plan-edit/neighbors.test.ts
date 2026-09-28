import { describe, expect, it } from "vitest";
import { neighborOf } from "./neighbors";

const PIE = { id: "1" };
const CRUST = { id: "2" };
const FILLING = { draftId: "d1" };
const ORDER = [PIE, CRUST, FILLING];

describe("neighborOf", () => {
  it("gives the item before, going backward", () => {
    expect(neighborOf(ORDER, CRUST, "backward")).toEqual(PIE);
  });

  it("gives the item after, going forward", () => {
    expect(neighborOf(ORDER, CRUST, "forward")).toEqual(FILLING);
  });

  it("gives the other neighbor when there's none that way", () => {
    expect(neighborOf(ORDER, PIE, "backward")).toEqual(CRUST);
    expect(neighborOf(ORDER, FILLING, "forward")).toEqual(CRUST);
  });

  it("gives nothing for a lone item", () => {
    expect(neighborOf([PIE], PIE, "backward")).toBeNull();
  });

  it("gives nothing for an item it doesn't know", () => {
    expect(neighborOf(ORDER, { id: "9" }, "forward")).toBeNull();
  });
});
