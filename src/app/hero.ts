import { heroui } from "@heroui/react";

export default heroui({
  prefix: "bfs",
  layout: {
    radius: {
      small: "4px",
      medium: "6px",
      large: "8px",
    },
  },
  themes: {
    light: {
      colors: {
        divider: "#a8a8a8",
      },
    },
    dark: {
      colors: {
        divider: "#444",
      },
    },
  },
});
