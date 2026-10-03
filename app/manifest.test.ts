import { existsSync } from "node:fs";
import { resolve } from "node:path";
import brand from "@/lib/brand.json";
import manifest from "./manifest";

const PUBLIC_DIR = resolve(__dirname, "../public");
const iconFile = (src: string) => resolve(PUBLIC_DIR, `.${src}`);

describe("manifest", () => {
  const m = manifest();

  it("opens the app on shopping, standalone, in the brand color", () => {
    expect(m.start_url).toBe("/shopping");
    expect(m.display).toBe("standalone");
    expect(m.theme_color).toBe(brand.color);
  });

  it("offers any and maskable icons at 192 and 512", () => {
    const offered = (m.icons ?? []).map((i) => `${i.sizes}:${i.purpose}`);
    expect(offered).toEqual(
      expect.arrayContaining([
        "192x192:any",
        "512x512:any",
        "192x192:maskable",
        "512x512:maskable",
      ]),
    );
  });

  it("has Shop, Plan and Library shortcuts to real pages", () => {
    expect((m.shortcuts ?? []).map((s) => [s.name, s.url])).toEqual([
      ["Shop", "/shopping"],
      ["Plan", "/planner"],
      ["Library", "/recipes"],
    ]);
  });

  it("only references icon files that exist", () => {
    const srcs = [
      ...(m.icons ?? []),
      ...(m.shortcuts ?? []).flatMap((s) => s.icons ?? []),
    ].map((i) => i.src);
    expect(srcs.length).toBeGreaterThan(0);
    expect(srcs.filter((src) => !existsSync(iconFile(src)))).toEqual([]);
  });
});
