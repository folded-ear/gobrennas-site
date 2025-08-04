import { tv } from "@/lib/utils";

export const ListBoxStyles = tv({
  slots: {
    list: [
      "group overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none",
      "data-[empty]:p-6 data-[empty]:text-center data-[empty]:text-sm",
    ],
    item: [
      "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
      /* Disabled */
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      /* Focused */
      "data-[focused]:bg-accent data-[focused]:text-accent-foreground",
      /* Hovered */
      "data-[hovered]:bg-accent data-[hovered]:text-accent-foreground",
      /* Selection */
      "data-[selection-mode]:pl-8",
    ],
    header: "py-1.5 pl-8 pr-2 text-sm font-semibold",
  },
});
