import { tv } from "@/lib/utils";

export const MenuStyles = tv({
  slots: {
    popover: "w-auto",
    menu: "max-h-[inherit] overflow-auto rounded-md p-1 outline outline-0 [clip-path:inset(0_0_0_0_round_calc(var(--radius)-2px))]",
    item: [
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
      /* Disabled */
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      /* Focused */
      "data-[focused]:bg-accent data-[focused]:text-accent-foreground ",
      /* Selection Mode */
      "data-[selection-mode]:pl-8",
    ],
    header: "px-3 py-1.5 text-sm font-semibold",
    separator: "-mx-1 my-1 h-px bg-muted",
    keyboard: "ml-auto text-xs tracking-widest opacity-60",
  },
  variants: {
    hasSeparator: {
      true: {
        header: "-mx-1 mb-1 border-b border-b-border pb-2.5",
      },
    },
  },
});
