import { PlanItemStatus } from "@/__generated__/graphql";
import { describe, expect, it } from "vitest";
import { stampChanges } from "./stamp";
import type { Change, Stamp, Stamper, StatusChange } from "./state";

const NOW = Date.parse("2026-11-12T17:30:00.000Z");

const SUGAR: StatusChange = {
  kind: "status",
  id: "31",
  planId: "7",
  name: "1 cup sugar",
  status: PlanItemStatus.ACQUIRED,
};

const FLOUR: StatusChange = {
  ...SUGAR,
  id: "32",
  name: "2 cups flour",
};

const STAMP: Stamp = {
  doneAt: "2026-11-12T17:30:00.000Z",
  coords: { latitude: 45.523, longitude: -122.676, accuracy: 35 },
};

describe("stampChanges", () => {
  it("adds the stamper's stamp to a status change", () => {
    const stamped = stampChanges([SUGAR], () => STAMP, NOW);

    expect(stamped).toEqual([{ ...SUGAR, ...STAMP }]);
  });

  it("leaves a status change alone when the stamper gives no stamp", () => {
    const stamped = stampChanges([SUGAR], () => null, NOW);

    expect(stamped).toEqual([SUGAR]);
  });

  it("stamps every change in a call as of the same now", () => {
    const nows: number[] = [];
    const stamper: Stamper = (_, now) => {
      nows.push(now);
      return null;
    };

    stampChanges([SUGAR, FLOUR], stamper, NOW);

    expect(nows).toEqual([NOW, NOW]);
  });

  it("passes changes other than statuses through unstamped", () => {
    const rename: Change = {
      kind: "rename",
      id: "31",
      planId: "7",
      name: "1 cup brown sugar",
    };

    const stamped = stampChanges([rename, SUGAR], () => STAMP, NOW);

    expect(stamped).toEqual([rename, { ...SUGAR, ...STAMP }]);
  });
});
