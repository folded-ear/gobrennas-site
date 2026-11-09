import { PreferenceValueFragmentDoc } from "@/hooks/use-preference/__generated__/preferenceValue.generated";
import { PREF_DEV_MODE } from "@/lib/preferences";
import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  within,
} from "@/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceTableFragmentDoc } from "./__generated__/deviceTable.generated";
import { DeviceTable } from "./index";

// a Sunday afternoon, local time
const NOW = new Date(2026, 10, 8, 15, 0);
const at = (...local: [number, number, number, number, number]) =>
  new Date(...local).toISOString();

const KITCHEN = {
  __typename: "UserDevice" as const,
  id: "11",
  name: "Kitchen iPad",
  key: "kitchen-ipad",
  lastEnsuredAt: at(2026, 10, 7, 18, 20),
};
const PHONE = {
  __typename: "UserDevice" as const,
  id: "12",
  name: "Barney’s Phone",
  key: "barneys-phone",
  lastEnsuredAt: at(2026, 10, 8, 14, 55),
};
const LAPTOP = {
  __typename: "UserDevice" as const,
  id: "13",
  name: "Old Laptop",
  key: "old-laptop",
  lastEnsuredAt: at(2026, 9, 29, 9, 10),
};

function renderTable({ devMode = false } = {}) {
  const cache = buildInMemoryCache();
  const user = seedFragment(
    cache,
    DeviceTableFragmentDoc,
    "deviceTable",
    { __typename: "User", devices: [KITCHEN, PHONE, LAPTOP] },
    { id: "User:8777749727401" },
  );
  if (devMode) {
    cache.writeFragment({
      id: cache.identify({ __typename: "UserPreference", name: PREF_DEV_MODE }),
      fragment: PreferenceValueFragmentDoc,
      data: { __typename: "UserPreference", value: "true" },
    });
  }
  render(<DeviceTable user={user} currentKey={PHONE.key} />, { cache });
}

function rowOf(name: string) {
  const row = screen.getByRole("rowheader", { name }).closest("[role=row]");
  if (!(row instanceof HTMLElement)) throw new Error(`No row for ${name}`);
  return row;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("DeviceTable", () => {
  it("lists devices in the order given", () => {
    renderTable();

    expect(
      screen.getAllByRole("rowheader").map((it) => it.textContent),
    ).toEqual(["Kitchen iPad", "Barney’s Phone", "Old Laptop"]);
  });

  it("gives the day each device was last used", () => {
    renderTable();

    expect(rowOf("Barney’s Phone")).toHaveTextContent("Today");
    expect(rowOf("Kitchen iPad")).toHaveTextContent("Yesterday");
    expect(rowOf("Old Laptop")).toHaveTextContent("Thu, Oct 29");
  });

  it("marks the device in use", () => {
    renderTable();

    expect(
      within(rowOf("Barney’s Phone")).getByRole("img", {
        name: "This device",
      }),
    ).toBeInTheDocument();
    expect(
      within(rowOf("Kitchen iPad")).queryByRole("img", {
        name: "This device",
      }),
    ).toBeNull();
  });

  it("shows device keys in dev mode", () => {
    renderTable({ devMode: true });

    expect(rowOf("Kitchen iPad")).toHaveTextContent(KITCHEN.key);
  });

  it("hides device keys outside dev mode", () => {
    renderTable();

    expect(screen.queryByText(KITCHEN.key)).toBeNull();
  });
});
