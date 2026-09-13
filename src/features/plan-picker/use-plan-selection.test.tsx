import { PreferenceValueFragmentDoc } from "@/hooks/use-preference/__generated__/preferenceValue.generated";
import { DoSetPreferenceDocument } from "@/hooks/use-set-preference/__generated__/doSetPreference.generated";
import { InitializeDeviceKeyDocument } from "@/lib/apollo/__generated__/initializeDeviceKey.generated";
import { formatIdSet } from "@/lib/preferences";
import { buildInMemoryCache, render, screen, userEvent, waitFor } from "@/test";
import { MockLink } from "@apollo/client/testing";
import { describe, expect, it } from "vitest";
import { PickablePlan, SelectionMode } from "./selection";
import { usePlanSelection } from "./use-plan-selection";

const DEVICE_KEY = "a-device-key";
const PREF_NAME = "somePlans";
const THE_PREF = { __typename: "UserPreference" as const, name: PREF_NAME };

const WEEKNIGHTS = { id: "1", mine: true };
const FEAST_DAY = { id: "2", mine: true };
const PLANS = [WEEKNIGHTS, FEAST_DAY];

type ProbeProps = {
  plans: readonly PickablePlan[];
  mode: SelectionMode;
};

function Probe({ plans, mode }: ProbeProps) {
  const [ids, setIds] = usePlanSelection(PREF_NAME, plans, mode);
  return (
    <>
      <output>{ids.join(",")}</output>
      <button onClick={() => setIds([FEAST_DAY.id])}>Pick Feast Day</button>
    </>
  );
}

function setPreferenceMock(value: string): MockLink.MockedResponse {
  return {
    request: {
      query: DoSetPreferenceDocument,
      variables: { name: PREF_NAME, value, deviceKey: DEVICE_KEY },
    },
    result: {
      data: {
        profile: {
          __typename: "ProfileMutation",
          setPreference: {
            __typename: "UserPreference",
            name: PREF_NAME,
            value,
          },
        },
      },
    },
  };
}

function renderProbe({
  stored,
  mode,
  mocks = [],
}: {
  stored: string | null;
  mode: SelectionMode;
  mocks?: MockLink.MockedResponse[];
}) {
  const cache = buildInMemoryCache();
  cache.writeQuery({
    query: InitializeDeviceKeyDocument,
    data: { deviceKey: DEVICE_KEY },
  });
  cache.writeFragment({
    id: cache.identify(THE_PREF),
    fragment: PreferenceValueFragmentDoc,
    data: { __typename: "UserPreference", value: stored },
  });
  render(<Probe plans={PLANS} mode={mode} />, { cache, mocks });
  return cache;
}

function storedValue(cache: ReturnType<typeof buildInMemoryCache>) {
  return cache.readFragment<{ value: string | null }>({
    fragment: PreferenceValueFragmentDoc,
    from: THE_PREF,
  })?.value;
}

describe("usePlanSelection", () => {
  it("selects the stored plans", () => {
    renderProbe({ stored: formatIdSet(["2", "1"]), mode: "multiple" });

    expect(screen.getByRole("status")).toHaveTextContent("1,2");
  });

  it("reads a single plan's bare id", () => {
    renderProbe({ stored: FEAST_DAY.id, mode: "single" });

    expect(screen.getByRole("status")).toHaveTextContent(FEAST_DAY.id);
  });

  it("fills an empty set with the first plan, and stores it", async () => {
    const cache = renderProbe({
      stored: formatIdSet([]),
      mode: "multiple",
      mocks: [setPreferenceMock(formatIdSet([WEEKNIGHTS.id]))],
    });

    expect(screen.getByRole("status")).toHaveTextContent(WEEKNIGHTS.id);
    await waitFor(() =>
      expect(storedValue(cache)).toBe(formatIdSet([WEEKNIGHTS.id])),
    );
  });

  it("fills an unset single plan with the first plan, and stores it", async () => {
    const cache = renderProbe({
      stored: null,
      mode: "single",
      mocks: [setPreferenceMock(WEEKNIGHTS.id)],
    });

    await waitFor(() => expect(storedValue(cache)).toBe(WEEKNIGHTS.id));
  });

  it("stores a new selection", async () => {
    const cache = renderProbe({
      stored: formatIdSet([WEEKNIGHTS.id]),
      mode: "multiple",
      mocks: [setPreferenceMock(formatIdSet([FEAST_DAY.id]))],
    });

    await userEvent.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(storedValue(cache)).toBe(formatIdSet([FEAST_DAY.id])),
    );
    expect(screen.getByRole("status")).toHaveTextContent(FEAST_DAY.id);
  });
});
