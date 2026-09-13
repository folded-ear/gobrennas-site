import { act, render, screen, userEvent, waitFor } from "@/test";
import { afterEach, describe, expect, it } from "vitest";
import { useHistoryState } from "./index";

const KEY = "planItem";

function Probe() {
  const { value, push, replace } = useHistoryState<string>(KEY);
  return (
    <>
      <output>{value ?? "nothing"}</output>
      <button onClick={() => push("pie")}>Push pie</button>
      <button onClick={() => replace("crust")}>Replace with crust</button>
    </>
  );
}

function shown() {
  return screen.getByRole("status").textContent;
}

afterEach(() => {
  window.history.replaceState(null, "");
});

describe("useHistoryState", () => {
  it("starts from what the current history entry holds", () => {
    window.history.replaceState({ [KEY]: "pie" }, "");

    render(<Probe />);

    expect(shown()).toBe("pie");
  });

  it("holds nothing on an entry without it", () => {
    render(<Probe />);

    expect(shown()).toBe("nothing");
  });

  it("goes back to nothing after a push", async () => {
    render(<Probe />);
    await userEvent.click(screen.getByRole("button", { name: "Push pie" }));
    expect(shown()).toBe("pie");

    act(() => window.history.back());

    await waitFor(() => expect(shown()).toBe("nothing"));
  });

  it("keeps other state on the entry when it writes", async () => {
    window.history.replaceState({ other: "kept" }, "");
    render(<Probe />);

    await userEvent.click(
      screen.getByRole("button", { name: "Replace with crust" }),
    );

    expect(shown()).toBe("crust");
    expect(window.history.state).toEqual({ other: "kept", [KEY]: "crust" });
  });

  it("stays put when something else pushes an entry on top", async () => {
    render(<Probe />);
    await userEvent.click(screen.getByRole("button", { name: "Push pie" }));

    act(() => window.history.pushState({ unrelated: true }, ""));

    expect(shown()).toBe("pie");
  });
});
