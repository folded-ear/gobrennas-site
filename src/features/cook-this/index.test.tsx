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

it("offers an installable bookmark without running the importer on Profile", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com");
  vi.stubEnv("NODE_ENV", "production");
  render(<CookThis />);
  const link = screen.getByRole("link", { name: "Cook This" });
  expect(link).toHaveAttribute("draggable", "true");
  expect(link.getAttribute("href")).toMatch(/^javascript:void/);
  expect(
    screen.getByText(/Drag Cook This to your browser/),
  ).toBeInTheDocument();
  await userEvent.click(link);
  expect(document.getElementById("foodinger-import-bookmarklet")).toBeNull();
});

it("blocks dragging an HTTP bookmark without a sign-in token", () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:8080");
  vi.stubEnv("NODE_ENV", "development");
  render(<CookThis />);
  const link = screen.getByRole("link", { name: "DEV Cook This" });
  expect(link).toHaveAttribute("aria-disabled", "true");
  expect(link).toHaveAttribute("draggable", "false");
  expect(link).not.toHaveAttribute("href");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Sign in before installing",
  );
});

it("allows an HTTP bookmark with a token and labels it DEV", () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:8080");
  vi.stubEnv("NODE_ENV", "development");
  getCookie.mockReturnValue("synthetic-test-credential");
  render(<CookThis />);
  const link = screen.getByRole("link", { name: "DEV Cook This" });
  expect(link).toHaveAttribute("draggable", "true");
  expect(link.getAttribute("href")).toContain(
    "token=synthetic-test-credential",
  );
});
