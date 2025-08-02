import { tv } from "@/lib/utils";

export const PopoverStyles = tv({
  base: [
    "z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none",
    /* Entering */
    "data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95",
    /* Exiting */
    "data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95",
    /* Placement */
    "data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2",
  ],
});
