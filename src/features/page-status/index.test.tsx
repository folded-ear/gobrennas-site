import { PageEngine, usePageEngine } from "@/features/page-engine";
import { changeMutation } from "@/features/page-engine/mutation";
import type { WorkerHost } from "@/features/page-engine/runner";
import { act, render, screen, userEvent } from "@/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PageStatus, SIGN_IN_TIP, UPDATE_TIP } from "./index";

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
  const engine = usePageEngine();
  return (
    <button type="button" onClick={() => engine.rename(RENAME)}>
      Rename
    </button>
  );
}

beforeEach(() => {
  doLogin.mockClear();
});

describe("PageStatus", () => {
  it("says nothing while all is well", () => {
    render(<PageStatus />);

    expect(screen.getByRole("status")).toHaveTextContent("");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says when the device is offline, and when it's back", () => {
    render(<PageStatus />);

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
      <PageEngine userId={null} renderedAt={0} worker={worker}>
        <PageStatus />
      </PageEngine>,
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

  it("explains the update offer in a tooltip", async () => {
    let waiting = () => {};
    render(
      <PageEngine
        userId={null}
        renderedAt={0}
        worker={{ register: (it) => (waiting = it), activate: () => {} }}
      >
        <PageStatus />
      </PageEngine>,
    );
    act(() => waiting());

    await userEvent.tab();

    expect(await screen.findByRole("tooltip")).toHaveTextContent(UPDATE_TIP);
  });

  it("offers to sign in again once the login has expired", async () => {
    const { mutation, variables } = changeMutation([RENAME]);
    render(
      <>
        <Renamer />
        <PageStatus />
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
    const signIn = await screen.findByRole("button", { name: "Sign in again" });

    await userEvent.tab();
    expect(signIn).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(SIGN_IN_TIP);

    await userEvent.click(signIn);
    expect(doLogin).toHaveBeenCalledTimes(1);
  });
});
