import { render, screen, userEvent } from "@/test";
import { afterEach, expect, it, vi } from "vitest";
import { CookThis } from "./index";

const { getCookie } = vi.hoisted(() => ({ getCookie: vi.fn() }));
vi.mock("next-client-cookies", () => ({
  useCookies: () => ({ get: getCookie }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  getCookie.mockReset();
});

it("uses the server-provided API address even without a browser environment variable", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", undefined);
  vi.stubEnv("NODE_ENV", "production");
  render(<CookThis apiRoot="https://api.example.com" />);
  const link = screen.getByRole("link", { name: "Cook This" });
  expect(link).toHaveAttribute("draggable", "true");
  expect(link.getAttribute("href")).toMatch(/^javascript:void/);
  expect(link.getAttribute("href")).toContain(
    "apiRoot=https%3A%2F%2Fapi.example.com",
  );
  expect(
    screen.getByText(/Drag Cook This to your browser/),
  ).toBeInTheDocument();
  await userEvent.click(link);
  expect(document.getElementById("foodinger-import-bookmarklet")).toBeNull();
});

it("blocks dragging an HTTP bookmark without a sign-in token", () => {
  vi.stubEnv("NODE_ENV", "development");
  render(<CookThis apiRoot="http://localhost:8080" />);
  const link = screen.getByRole("link", { name: "DEV Cook This" });
  expect(link).toHaveAttribute("aria-disabled", "true");
  expect(link).toHaveAttribute("draggable", "false");
  expect(link).not.toHaveAttribute("href");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Sign in before installing",
  );
});

it("allows an HTTP bookmark with a token and labels it DEV", () => {
  vi.stubEnv("NODE_ENV", "development");
  getCookie.mockReturnValue("synthetic-test-credential");
  render(<CookThis apiRoot="http://localhost:8080" />);
  const link = screen.getByRole("link", { name: "DEV Cook This" });
  expect(link).toHaveAttribute("draggable", "true");
  expect(link.getAttribute("href")).toContain(
    "token=synthetic-test-credential",
  );
});

it.each(["", "/api", "not a URL", "ftp://example.com"])(
  "keeps Profile usable and installation disabled for invalid API address %s",
  (apiRoot) => {
    vi.stubEnv("NODE_ENV", "development");
    render(<CookThis apiRoot={apiRoot} />);
    const link = screen.getByRole("link", { name: "DEV Cook This" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("draggable", "false");
    expect(link).not.toHaveAttribute("href");
    expect(screen.getByRole("status")).toHaveTextContent(
      "API address is not configured correctly",
    );
  },
);
