import { PreferenceValueFragmentDoc } from "@/hooks/use-preference/__generated__/preferenceValue.generated";
import { DoSetPreferenceDocument } from "@/hooks/use-set-preference/__generated__/doSetPreference.generated";
import { InitializeDeviceKeyDocument } from "@/lib/apollo/__generated__/initializeDeviceKey.generated";
import { PREF_DEV_MODE } from "@/lib/preferences";
import { buildInMemoryCache, render, screen, userEvent } from "@/test";
import { describe, expect, it } from "vitest";
import { DevModeOnly, DevModeSwitch } from "./index";

const DEVICE_KEY = "kitchen-ipad";
const SWITCH = { name: "Dev Mode" };
const DETAIL = "Viewport 393 × 659";

function setTo(value: string) {
  return {
    request: {
      query: DoSetPreferenceDocument,
      variables: { name: PREF_DEV_MODE, value, deviceKey: DEVICE_KEY },
    },
    result: {
      data: {
        profile: {
          __typename: "ProfileMutation" as const,
          setPreference: {
            __typename: "UserPreference" as const,
            name: PREF_DEV_MODE,
            value,
          },
        },
      },
    },
  };
}

function renderDevMode(stored?: string) {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: InitializeDeviceKeyDocument,
    data: { deviceKey: DEVICE_KEY },
  });
  if (stored !== undefined) {
    cache.writeFragment({
      id: cache.identify({ __typename: "UserPreference", name: PREF_DEV_MODE }),
      fragment: PreferenceValueFragmentDoc,
      data: { __typename: "UserPreference", value: stored },
    });
  }
  render(
    <>
      <DevModeSwitch />
      <DevModeOnly>
        <p>{DETAIL}</p>
      </DevModeOnly>
    </>,
    { cache, mocks: [setTo("true"), setTo("false")] },
  );
}

describe("DevModeSwitch", () => {
  it("is off on a device that never turned it on", () => {
    renderDevMode();

    expect(screen.getByRole("switch", SWITCH)).not.toBeChecked();
    expect(screen.queryByText(DETAIL)).toBeNull();
  });

  it("shows developer details on a device with it on", () => {
    renderDevMode("true");

    expect(screen.getByRole("switch", SWITCH)).toBeChecked();
    expect(screen.getByText(DETAIL)).toBeVisible();
  });

  it("shows developer details once turned on", async () => {
    renderDevMode("false");

    await userEvent.click(screen.getByRole("switch", SWITCH));

    expect(await screen.findByText(DETAIL)).toBeVisible();
  });

  it("hides developer details once turned off", async () => {
    renderDevMode("true");

    await userEvent.click(screen.getByRole("switch", SWITCH));

    expect(screen.getByRole("switch", SWITCH)).not.toBeChecked();
    expect(screen.queryByText(DETAIL)).toBeNull();
  });
});
