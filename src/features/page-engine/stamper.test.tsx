import { PlanItemStatus } from "@/__generated__/graphql";
import { render, screen, userEvent, waitFor } from "@/test";
import { MockLink } from "@apollo/client/testing";
import { describe, expect, it } from "vitest";
import { StamperProvider, usePageEngine } from "./index";
import { changeMutation } from "./mutation";
import type { Stamp, StatusChange } from "./state";
import { seededCache, THANKSGIVING } from "./test/status-cache";

const CREAM: StatusChange = {
  kind: "status",
  id: "3",
  planId: THANKSGIVING,
  name: "Whipped cream",
  status: PlanItemStatus.ACQUIRED,
};

const STAMP: Stamp = {
  doneAt: "2026-11-12T17:30:00.000Z",
  coords: { latitude: 45.523, longitude: -122.676, accuracy: 35 },
};

const STAMP_VARIABLES = { doneAt0: STAMP.doneAt, coords0: STAMP.coords };

function Acquire() {
  const engine = usePageEngine();
  return (
    <button type="button" onClick={() => engine.set([CREAM])}>
      Acquire
    </button>
  );
}

/** I answer the request for change, recording the variables it was sent. */
function saved(
  change: StatusChange,
  sent: Record<string, unknown>[],
): MockLink.MockedResponse {
  return {
    request: {
      query: changeMutation([change]).mutation,
      variables: (variables) => {
        sent.push(variables);
        return true;
      },
    },
    result: {
      data: {
        planner: {
          __typename: "PlannerMutation",
          s0: { __typename: "PlanItem", id: change.id, status: change.status },
        },
      },
    },
  };
}

describe("StamperProvider", () => {
  it("sends a status change made under it with its stamper's stamp", async () => {
    const sent: Record<string, unknown>[] = [];
    render(
      <StamperProvider stamper={() => STAMP}>
        <Acquire />
      </StamperProvider>,
      { cache: seededCache(), mocks: [saved({ ...CREAM, ...STAMP }, sent)] },
    );

    await userEvent.click(screen.getByRole("button", { name: "Acquire" }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject(STAMP_VARIABLES);
  });

  it("sends a status change made outside one unstamped", async () => {
    const sent: Record<string, unknown>[] = [];
    render(<Acquire />, {
      cache: seededCache(),
      mocks: [saved(CREAM, sent)],
    });

    await userEvent.click(screen.getByRole("button", { name: "Acquire" }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).not.toHaveProperty("coords0");
    expect(sent[0]).toMatchObject({ doneAt0: null });
  });
});
