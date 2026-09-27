import { PlanItemStatus } from "@/__generated__/graphql";
import { act, renderHook, screen } from "@/test";
import { ApolloProvider } from "@apollo/client/react";
import { Toast } from "@heroui/react";
import { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatusChange } from "./queue";
import { statusApiClient, StatusRequest } from "./test/status-api";
import { seededCache, THANKSGIVING } from "./test/status-cache";
import { usePlanStatus } from "./use-plan-status";

const PIE: StatusChange = {
  id: "1",
  planId: THANKSGIVING,
  name: "Pumpkin pie",
  status: PlanItemStatus.DELETED,
};
const CREAM: StatusChange = {
  id: "3",
  planId: THANKSGIVING,
  name: "Whipped cream",
  status: PlanItemStatus.ACQUIRED,
};

let requests: StatusRequest[];

function renderStatus({ refuse = false } = {}) {
  const client = statusApiClient(seededCache(), requests, { refuse });
  return renderHook(() => usePlanStatus(), {
    wrapper: ({ children }: PropsWithChildren) => (
      <ApolloProvider client={client}>
        {children}
        <Toast.Provider />
      </ApolloProvider>
    ),
  });
}

function hidePage() {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  requests = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePlanStatus", () => {
  it("sends held removals the moment the page is hidden", () => {
    const { result } = renderStatus();
    act(() => result.current.hold(PIE));

    act(hidePage);

    expect(requests).toEqual([
      {
        variables: { id0: PIE.id, status0: PIE.status },
        keepalive: true,
      },
    ]);
  });

  it("says what couldn't be saved", async () => {
    const { result } = renderStatus({ refuse: true });

    act(() => result.current.set([CREAM]));

    expect(
      await screen.findByText("Couldn't save Whipped cream"),
    ).toBeInTheDocument();
  });
});
