import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import brand from "./brand.json";

const BRAND_TOKEN = /--color-brand:\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/;

const toSrgbHex = (lightnessPct: number, chroma: number, hueDeg: number) => {
  const L = lightnessPct / 100;
  const hue = (hueDeg * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const channel = (x: number) =>
    Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055))
      .toString(16)
      .padStart(2, "0");
  return `#${linear.map(channel).join("")}`;
};

describe("brand color", () => {
  it("matches --color-brand in globals.css", () => {
    const css = readFileSync(resolve(__dirname, "../../app/globals.css"), "utf8");
    const match = BRAND_TOKEN.exec(css);
    expect(match).not.toBeNull();
    const [, lightness, chroma, hue] = match!;

    expect(brand.color).toBe(
      toSrgbHex(Number(lightness), Number(chroma), Number(hue)),
    );
  });
});
