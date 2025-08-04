"use client";

import {
  Dialog as AriaDialog,
  DialogProps as AriaDialogProps,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
  PopoverProps as AriaPopoverProps,
  composeRenderProps,
} from "react-aria-components";

import { PopoverStyles } from "@/components/ui/popover/styles";
import { cn } from "@/lib/utils";

const PopoverTrigger = AriaDialogTrigger;

const Popover = ({ className, offset = 4, ...props }: AriaPopoverProps) => (
  <AriaPopover
    offset={offset}
    className={composeRenderProps(className, (className) =>
      PopoverStyles({ className }),
    )}
    {...props}
  />
);

function PopoverDialog({ className, ...props }: AriaDialogProps) {
  return (
    <AriaDialog className={cn("p-4 outline outline-0", className)} {...props} />
  );
}

export { Popover, PopoverDialog, PopoverTrigger };
