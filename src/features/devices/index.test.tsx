import { PreferenceValueFragmentDoc } from "@/hooks/use-preference/__generated__/preferenceValue.generated";
import { PREF_DEV_MODE } from "@/lib/preferences";
import {
  buildInMemoryCache,
  render,
  screen,
  seedFragment,
  userEvent,
  within,
} from "@/test";
import { MockLink } from "@apollo/client/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceTableFragmentDoc } from "./__generated__/deviceTable.generated";
import {
  RenameDeviceDocument,
  type RenameDeviceMutation,
} from "./__generated__/renameDevice.generated";
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

function renamed(id: string, name: string): MockLink.MockedResponse {
  const data: RenameDeviceMutation = {
    profile: {
      __typename: "ProfileMutation",
      renameDevice: { __typename: "UserDevice", id, name },
    },
  };
  return {
    request: { query: RenameDeviceDocument, variables: { id, name } },
    result: { data },
  };
}

function renderTable({
  devMode = false,
  mocks = [],
}: {
  devMode?: boolean;
  mocks?: ReadonlyArray<MockLink.MockedResponse>;
} = {}) {
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
  render(<DeviceTable user={user} currentKey={PHONE.key} />, {
    cache,
    mocks,
  });
}

function rowOf(name: string) {
  const row = screen.getByText(name).closest("[role=row]");
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

  describe("renaming", () => {
    it("offers to rename each device", () => {
      renderTable();

      expect(
        within(rowOf("Old Laptop")).getByRole("button", {
          name: "Rename Old Laptop",
        }),
      ).toBeInTheDocument();
    });

    it("starts from the current name", async () => {
      const user = userEvent.setup();
      renderTable();

      await user.click(
        screen.getByRole("button", { name: "Rename Kitchen iPad" }),
      );

      const field = screen.getByRole("textbox", { name: "Device name" });
      expect(field).toHaveValue("Kitchen iPad");
      expect(field).toHaveFocus();
    });

    it("saves the trimmed name on Enter", async () => {
      const user = userEvent.setup();
      renderTable({ mocks: [renamed(KITCHEN.id, "Kitchen counter iPad")] });

      await user.click(
        screen.getByRole("button", { name: "Rename Kitchen iPad" }),
      );
      const field = screen.getByRole("textbox", { name: "Device name" });
      await user.clear(field);
      await user.type(field, "  Kitchen counter iPad  {Enter}");

      const rename = await screen.findByRole("button", {
        name: "Rename Kitchen counter iPad",
      });
      expect(screen.queryByRole("textbox")).toBeNull();
      expect(rename).toHaveFocus();
    });

    it("saves a blank name as the device's id", async () => {
      const user = userEvent.setup();
      renderTable({ mocks: [renamed(LAPTOP.id, `Device ${LAPTOP.id}`)] });

      await user.click(
        screen.getByRole("button", { name: "Rename Old Laptop" }),
      );
      const field = screen.getByRole("textbox", { name: "Device name" });
      await user.clear(field);
      await user.type(field, "   ");
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(
        await screen.findByRole("button", {
          name: `Rename Device ${LAPTOP.id}`,
        }),
      ).toBeInTheDocument();
    });

    it("cancels on Escape, keeping the name", async () => {
      const user = userEvent.setup();
      renderTable();

      await user.click(
        screen.getByRole("button", { name: "Rename Kitchen iPad" }),
      );
      await user.type(
        screen.getByRole("textbox", { name: "Device name" }),
        " Pro{Escape}",
      );

      expect(screen.queryByRole("textbox")).toBeNull();
      expect(
        screen.getByRole("button", { name: "Rename Kitchen iPad" }),
      ).toHaveFocus();
    });

    it("cancels with the Cancel button, keeping the name", async () => {
      const user = userEvent.setup();
      renderTable();

      await user.click(
        screen.getByRole("button", { name: "Rename Kitchen iPad" }),
      );
      await user.type(
        screen.getByRole("textbox", { name: "Device name" }),
        " Pro",
      );
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("textbox")).toBeNull();
      expect(
        screen.getByRole("button", { name: "Rename Kitchen iPad" }),
      ).toHaveFocus();
    });

    it("keeps the draft after a failed rename", async () => {
      const user = userEvent.setup();
      renderTable({
        mocks: [
          {
            request: {
              query: RenameDeviceDocument,
              variables: { id: KITCHEN.id, name: "Kitchen iPad Pro" },
            },
            error: new Error("Offline"),
          },
        ],
      });

      await user.click(
        screen.getByRole("button", { name: "Rename Kitchen iPad" }),
      );
      await user.type(
        screen.getByRole("textbox", { name: "Device name" }),
        " Pro{Enter}",
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not rename the device",
      );
      expect(screen.getByRole("textbox", { name: "Device name" })).toHaveValue(
        "Kitchen iPad Pro",
      );
    });
  });
});
