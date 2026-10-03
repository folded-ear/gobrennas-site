// Builds every app icon from assets/bfs-logo.svg and Lucide's icon data.
// Usage: pnpm run icons [-- --color "#rrggbb"]  (default: src/lib/brand.json)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LOGO_SVG = resolve(ROOT, "assets/bfs-logo.svg");
const BRAND_JSON = resolve(ROOT, "src/lib/brand.json");
const LUCIDE_ICONS = resolve(ROOT, "node_modules/lucide-react/dist/esm/icons");
const LOGO_VIEWBOX = { width: 26, height: 25 };
const LUCIDE_VIEWBOX = 24;
const FOREGROUND = "#ffffff";
const MARK_FRACTION = { any: 0.62, maskable: 0.4 };
const SHORTCUT_FRACTION = 0.6;
const APP_SIZES = [192, 512];
const SHORTCUT_SIZES = [96, 192];
const SHORTCUTS = {
  shop: "shopping-cart",
  plan: "calendar",
  library: "book-open",
};
const APPLE_ICON_SIZE = 180;
const GENERATED_HEADER = `/*
 * GENERATED FILE - DO NOT EDIT.
 * Written by scripts/build-icons.mjs (pnpm run icons) from assets/bfs-logo.svg.
 * To change the logo, change the art and rerun the script.
 */`;

const { values } = parseArgs({ options: { color: { type: "string" } } });
const color =
  values.color ?? JSON.parse(readFileSync(BRAND_JSON, "utf8")).color;

const logoPath = /\sd="([^"]+)"/.exec(readFileSync(LOGO_SVG, "utf8"))[1];

const write = (relative, data) => {
  const file = resolve(ROOT, relative);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
};

const centered = (size, fraction, boxWidth, boxHeight, inner) => {
  const scale = (size * fraction) / Math.max(boxWidth, boxHeight);
  const x = (size - boxWidth * scale) / 2;
  const y = (size - boxHeight * scale) / 2;
  return `<g transform="translate(${x} ${y}) scale(${scale})">${inner}</g>`;
};

const square = (size, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
  `viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" ` +
  `fill="${color}"/>${inner}</svg>`;

const logoSquare = (size, fraction) =>
  square(
    size,
    centered(
      size,
      fraction,
      LOGO_VIEWBOX.width,
      LOGO_VIEWBOX.height,
      `<path d="${logoPath}" fill="${FOREGROUND}"/>`,
    ),
  );

const lucideShapes = async (name) => {
  const { __iconNode } = await import(
    pathToFileURL(resolve(LUCIDE_ICONS, `${name}.mjs`))
  );
  const shapes = __iconNode.map(([tag, { key: _key, ...attrs }]) => {
    const rendered = Object.entries(attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(" ");
    return `<${tag} ${rendered}/>`;
  });
  return (
    `<g fill="none" stroke="${FOREGROUND}" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round">${shapes.join("")}</g>`
  );
};

const png = (relative, svg) =>
  sharp(Buffer.from(svg)).png().toFile(resolve(ROOT, relative));

mkdirSync(resolve(ROOT, "public/icons"), { recursive: true });

write(
  "app/icon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="25" ` +
    `viewBox="0 0 26 25"><path d="${logoPath}" fill="${color}"/></svg>\n`,
);

await png("app/apple-icon.png", logoSquare(APPLE_ICON_SIZE, MARK_FRACTION.any));
for (const size of APP_SIZES) {
  await png(
    `public/icons/icon-${size}.png`,
    logoSquare(size, MARK_FRACTION.any),
  );
  await png(
    `public/icons/icon-${size}-maskable.png`,
    logoSquare(size, MARK_FRACTION.maskable),
  );
}

for (const [name, lucide] of Object.entries(SHORTCUTS)) {
  const shapes = await lucideShapes(lucide);
  for (const size of SHORTCUT_SIZES) {
    await png(
      `public/icons/${name}-${size}.png`,
      square(
        size,
        centered(
          size,
          SHORTCUT_FRACTION,
          LUCIDE_VIEWBOX,
          LUCIDE_VIEWBOX,
          shapes,
        ),
      ),
    );
  }
}

write(
  "src/components/bfs-logo-mark.tsx",
  `${GENERATED_HEADER}
import { SVGProps } from "react";

export const BFSLogoMark = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="${logoPath}"
      style={{ fill: "var(--accent)" }}
    />
  </svg>
);
`,
);
