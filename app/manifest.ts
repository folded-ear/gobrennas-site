import brand from "@/lib/brand.json";
import type { MetadataRoute } from "next";

const BACKGROUND_COLOR = "#f6f6f5";
const SHORTCUT_ICON_SIZES = [96, 192];

const shortcut = (name: string, icon: string, url: string) => ({
  name,
  url,
  icons: SHORTCUT_ICON_SIZES.map((size) => ({
    src: `/icons/${icon}-${size}.png`,
    sizes: `${size}x${size}`,
    type: "image/png",
  })),
});

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brenna's Food Software",
    short_name: "BFS",
    start_url: "/shopping",
    display: "standalone",
    theme_color: brand.color,
    background_color: BACKGROUND_COLOR,
    icons: [192, 512].flatMap((size) =>
      (["any", "maskable"] as const).map((purpose) => ({
        src: `/icons/icon-${size}${purpose === "any" ? "" : `-${purpose}`}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose,
      })),
    ),
    shortcuts: [
      shortcut("Shop", "shop", "/shopping"),
      shortcut("Plan", "plan", "/planner"),
      shortcut("Library", "library", "/recipes"),
    ],
  };
}
