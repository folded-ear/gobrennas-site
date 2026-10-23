import { PageEngine, usePageEngine } from "@/features/page-engine";
import { changeMutation } from "@/features/page-engine/mutation";
import type { WorkerHost } from "@/features/page-engine/runner";
import { act, render, screen, userEvent, waitFor, within } from "@/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PageStatus,
  RELOAD_DEADLINE_MS,
  SIGN_IN_TIP,
  UPDATE_TIP,
} from "./index";

const { doLogin } = vi.hoisted(() => ({ doLogin: vi.fn() }));

vi.mock("@/constants", () => ({ doLogin }));

const RENAME = {
  kind: "rename",
  id: "3",
  planId: "7",
  name: "Ice cream",
} as const;

const { mutation, variables } = changeMutation([RENAME]);

const UNAUTHORIZED = {
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
};

/** I make a change, for the server to answer. */
function Renamer() {
  const engine = usePageEngine();
  return (
    <button type="button" onClick={() => engine.rename(RENAME)}>
      Rename
    </button>
  );
}

/** I give a worker, and a way to make a new version wait in it. */
function waitingWorker() {
  let waiting = () => {};
  const worker: WorkerHost = {
    register: (onWaiting) => {
      waiting = onWaiting;
    },
    activate: vi.fn(),
  };
  return { worker, wait: () => act(() => waiting()) };
}

/** I render the status, then let the login expire under it. */
async function renderSignedOut(worker: WorkerHost | null = null) {
  render(
    <PageEngine userId={null} renderedAt={0} worker={worker}>
      <Renamer />
      <PageStatus />
    </PageEngine>,
    { mocks: [UNAUTHORIZED] },
  );
  await userEvent.click(screen.getByRole("button", { name: "Rename" }));
  return screen.findByRole("button", { name: "Sign in again" });
}

/** I switch to fake timers, giving a user who works with them. */
function fakeTimedUser() {
  // Testing Library only advances fake timers it takes for Jest's.
  vi.stubGlobal("jest", { advanceTimersByTime: vi.advanceTimersByTime });
  vi.useFakeTimers();
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

let reload = vi.fn();

beforeEach(() => {
  doLogin.mockReset().mockReturnValue(new Promise(() => {}));
  reload = vi.fn();
  vi.stubGlobal("location", { ...window.location, reload });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
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
    const { worker, wait } = waitingWorker();
    render(
      <PageEngine userId={null} renderedAt={0} worker={worker}>
        <PageStatus />
      </PageEngine>,
    );
    expect(
      screen.queryByRole("button", { name: "Update available" }),
    ).toBeNull();

    wait();
    await userEvent.click(
      screen.getByRole("button", { name: "Update available" }),
    );

    expect(worker.activate).toHaveBeenCalledTimes(1);
  });

  it("explains the update offer in a tooltip", async () => {
    const { worker, wait } = waitingWorker();
    render(
      <PageEngine userId={null} renderedAt={0} worker={worker}>
        <PageStatus />
      </PageEngine>,
    );
    wait();

    await userEvent.tab();

    expect(await screen.findByRole("tooltip")).toHaveTextContent(UPDATE_TIP);
  });

  it("shows it's updating, and reloads if the switch stalls", async () => {
    const { worker, wait } = waitingWorker();
    render(
      <PageEngine userId={null} renderedAt={0} worker={worker}>
        <PageStatus />
      </PageEngine>,
    );
    wait();
    const user = fakeTimedUser();

    const update = screen.getByRole("button", { name: "Update available" });
    await user.click(update);

    expect(within(update).getByRole("status")).toHaveAccessibleName("Loading");
    act(() => vi.advanceTimersByTime(RELOAD_DEADLINE_MS - 1));
    expect(reload).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("offers to sign in again once the login has expired", async () => {
    const signIn = await renderSignedOut();

    await userEvent.tab();
    expect(signIn).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(SIGN_IN_TIP);

    await userEvent.click(signIn);
    expect(doLogin).toHaveBeenCalledTimes(1);
  });

  it("shows it's signing in, and reloads if sign-in stalls", async () => {
    const signIn = await renderSignedOut();
    const user = fakeTimedUser();

    await user.click(signIn);
    await user.click(signIn);

    expect(doLogin).toHaveBeenCalledTimes(1);
    expect(within(signIn).getByRole("status")).toHaveAccessibleName("Loading");
    act(() => vi.advanceTimersByTime(RELOAD_DEADLINE_MS - 1));
    expect(reload).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("reloads at once if sign-in fails", async () => {
    doLogin.mockRejectedValue(new Error("Failed to find Server Action"));
    const signIn = await renderSignedOut();

    await userEvent.click(signIn);

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it("still reloads if the device goes offline while signing in", async () => {
    const signIn = await renderSignedOut();
    const user = fakeTimedUser();

    await user.click(signIn);
    act(() => window.dispatchEvent(new Event("offline")));
    act(() => vi.advanceTimersByTime(RELOAD_DEADLINE_MS));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("offers only the most pressing of its offers", async () => {
    const { worker, wait } = waitingWorker();
    await renderSignedOut(worker);
    wait();

    act(() => window.dispatchEvent(new Event("offline")));
    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in again" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Update available" }),
    ).toBeNull();

    act(() => window.dispatchEvent(new Event("online")));
    expect(
      screen.getByRole("button", { name: "Sign in again" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Update available" }),
    ).toBeNull();
  });
});
