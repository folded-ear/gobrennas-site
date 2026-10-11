import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { bookmarkletUrl } from "./bookmarklet";

const source = readFileSync(
  "../api/src/main/resources/public/import_bookmarklet.js",
  "utf8",
);
const gatewayName = "foodinger_import_bookmarklet_gateway_Ch8LF4wGvsRHN3nM0jFv";

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("preserves importing reviewed details and links to the current recipe routes", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { profile: { me: { imageUrl: null } } } }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { library: { createRecipe: { id: "42" } } } }),
    });
  vi.stubGlobal("fetch", fetch);
  new Function(
    bookmarkletUrl("http://localhost:4000", "http://localhost:8080").slice(11),
  )();
  new Function(source)();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  const set = (name: string, value: string) => {
    const input = document.querySelector(
      `[name="${name}"]`,
    ) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event("change"));
  };
  set("title", "Roasted carrots");
  set("ingredients", "4 carrots\n1 tbsp olive oil");
  set("directions", "Toss with oil.\nRoast until tender.");
  const gateway = (
    window as unknown as Record<string, { doImport: () => void }>
  )[gatewayName];
  gateway.doImport();
  await vi.waitFor(() =>
    expect(
      document.querySelector('a[href="http://localhost:4000/recipes/42"]'),
    ).not.toBeNull(),
  );
  expect(
    document.querySelector('a[href="http://localhost:4000/recipes/42/edit"]'),
  ).not.toBeNull();
  const [url, request] = fetch.mock.calls[1];
  expect(url).toBe("http://localhost:8080/graphql");
  const body = JSON.parse(request.body);
  expect(body.query).toContain("cookThis: true");
  expect(body.variables.info).toMatchObject({
    name: "Roasted carrots",
    ingredients: [{ raw: "4 carrots" }, { raw: "1 tbsp olive oil" }],
    directions: "1.  Toss with oil.\n1.  Roast until tender.",
  });
});
