import { PlanItemStatus } from "@/__generated__/graphql";
import { act, renderHook, screen } from "@/test";
import { ApolloProvider } from "@apollo/client/react";
import { Toast } from "@heroui/react";
import { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatusChange } from "./queue";
import { changeApiClient, ChangeRequest } from "./test/change-api";
import { seededCache, THANKSGIVING } from "./test/status-cache";
import { usePlanChanges } from "./use-plan-changes";

const PIE: StatusChange = {
  kind: "status",
  id: "1",
  planId: THANKSGIVING,
  name: "Pumpkin pie",
  status: PlanItemStatus.DELETED,
};
const CREAM: StatusChange = {
  kind: "status",
  id: "3",
  planId: THANKSGIVING,
  name: "Whipped cream",
  status: PlanItemStatus.ACQUIRED,
};

let requests: ChangeRequest[];

function renderStatus({ refuse = false } = {}) {
  const client = changeApiClient(seededCache(), requests, { refuse });
  return renderHook(() => usePlanChanges(), {
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

describe("usePlanChanges", () => {
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
