import { PlanSync, usePlanSync } from "@/features/plan-sync";
import { changeMutation } from "@/features/plan-sync/mutation";
import type { WorkerHost } from "@/features/plan-sync/runner";
import { act, render, screen, userEvent } from "@/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SyncStatus } from "./index";

const { doLogin } = vi.hoisted(() => ({ doLogin: vi.fn() }));

vi.mock("@/constants", () => ({ doLogin }));

const RENAME = {
  kind: "rename",
  id: "3",
  planId: "7",
  name: "Ice cream",
} as const;

/** I make a change, for the server to answer. */
function Renamer() {
  const sync = usePlanSync();
  return (
    <button type="button" onClick={() => sync.rename(RENAME)}>
      Rename
    </button>
  );
}

beforeEach(() => {
  doLogin.mockClear();
});

describe("SyncStatus", () => {
  it("says nothing while all is well", () => {
    render(<SyncStatus />);

    expect(screen.getByRole("status")).toHaveTextContent("");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says when the device is offline, and when it's back", () => {
    render(<SyncStatus />);

    act(() => window.dispatchEvent(new Event("offline")));
    expect(screen.getByRole("status")).toHaveTextContent("Offline");

    act(() => window.dispatchEvent(new Event("online")));
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("offers a waiting version, and switches to it when asked", async () => {
    let waiting = () => {};
    const worker: WorkerHost = {
      register: (onWaiting) => {
        waiting = onWaiting;
      },
      activate: vi.fn(),
    };
    render(
      <PlanSync userId={null} renderedAt={0} worker={worker}>
        <SyncStatus />
      </PlanSync>,
    );
    expect(
      screen.queryByRole("button", { name: "Update available" }),
    ).toBeNull();

    act(() => waiting());
    await userEvent.click(
      screen.getByRole("button", { name: "Update available" }),
    );

    expect(worker.activate).toHaveBeenCalledTimes(1);
  });

  it("offers to sign in again once the login has expired", async () => {
    const { mutation, variables } = changeMutation([RENAME]);
    render(
      <>
        <Renamer />
        <SyncStatus />
      </>,
      {
        mocks: [
          {
            request: { query: mutation, variables },
            result: {
              errors: [
                {
                  message: "Unauthorized",
                  path: ["planner", "s0"],
                  extensions: { classification: "UNAUTHORIZED" },
                },
              ],
            },
          },
        ],
      },
    );
    await userEvent.click(screen.getByRole("button", { name: "Rename" }));

    await userEvent.click(
      await screen.findByRole("button", { name: "Sign in again" }),
    );

    expect(doLogin).toHaveBeenCalledTimes(1);
  });
});
