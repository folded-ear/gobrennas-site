import { describe, expect, it, vi } from "vitest";
import { bookmarkletUrl } from "./bookmarklet";

describe("Cook This bookmarklet", () => {
  it("loads the importer with separate app and API roots and prevents duplicate overlays", () => {
    const href = bookmarkletUrl(
      "http://localhost:4000/",
      "http://localhost:8080/",
    );
    const run = () => new Function(href.slice("javascript:".length))();
    run();
    const script = document.getElementById(
      "foodinger-import-bookmarklet",
    ) as HTMLScriptElement;
    const url = new URL(script.src);
    expect(url.origin + url.pathname).toBe(
      "http://localhost:8080/import_bookmarklet.js",
    );
    expect(url.searchParams.get("appRoot")).toBe("http://localhost:4000");
    expect(url.searchParams.get("apiRoot")).toBe("http://localhost:8080");
    expect(url.searchParams.has("token")).toBe(false);
    run();
    expect(
      document.querySelectorAll("#foodinger-import-bookmarklet"),
    ).toHaveLength(1);
    script.remove();
  });

  it("requests a fresh script each time the saved bookmark runs", () => {
    const clock = vi.spyOn(Date, "now");
    const run = new Function(
      bookmarkletUrl("https://example.com", "https://api.example.com").slice(
        11,
      ),
    );
    for (const time of [1000, 2000]) {
      clock.mockReturnValue(time);
      run();
      const script = document.getElementById(
        "foodinger-import-bookmarklet",
      ) as HTMLScriptElement;
      expect(new URL(script.src).searchParams.get("_")).toBe(String(time));
      script.remove();
    }
    clock.mockRestore();
  });
});
