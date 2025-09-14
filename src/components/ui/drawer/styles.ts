import { tv } from "@/lib/utils";

export const DrawerStyles = tv({
  slots: {
    drawer: `h-lvh flex`,
    tabs: "",
    expand: [
      "w-[50px] rounded-l-lg rounded-r-none border-t border-l border-b border-outline m-0",
      "hover:border-primary hover:bg-bfs-muted",
    ],
    tab: [
      "w-[50px] rounded-l-lg rounded-r-none border-t border-l border-b border-outline m-0",
      "hover:border-primary hover:bg-bfs-muted",
      "selected:border-primary selected:bg-bfs-muted",
    ],
    view: "p-sm w-[var(--drawer-width)] bg-surface border-l border-divider",
  },
  variants: {
    isExpanded: {
      true: {
        view: "block",
      },
      false: {
        view: "hidden",
      },
    },
  },
});
