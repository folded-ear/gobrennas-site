import { tv } from "@/lib/utils";

export const SelectStyles = tv({
  slots: {
    select: "group flex flex-col gap-2",
    value: [
      "line-clamp-1 data-[placeholder]:text-muted-foreground",
      /* Description */
      "[&>[slot=description]]:hidden",
    ],
    trigger: [
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
      /* Disabled */
      "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
      /* Focused */
      "data-[focus-visible]:outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-ring data-[focus-visible]:ring-offset-2",
      /* Resets */
      "focus-visible:outline-none",
    ],
    popover: "w-[--trigger-width]",
    list: "max-h-[inherit] overflow-auto p-1 outline-none [clip-path:inset(0_0_0_0_round_calc(var(--radius)-2px))]",
  },
});
