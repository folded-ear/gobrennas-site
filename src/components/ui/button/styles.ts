import { tv } from "@/lib/utils";

export const ButtonStyles = tv({
  base: [
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors",
    /* Disabled */
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ",
    /* Focus Visible */
    "data-[focus-visible]:outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-ring data-[focus-visible]:ring-offset-2",
    /* Resets */
    "focus-visible:outline-none",
  ],
  variants: {
    variant: {
      default: "bg-bfs fg-default data-[hovered]:bg-bfs/90",
      destructive: "bg-critical fg-muted data-[hovered]:bg-critical/90",
      outline:
        "border border-input bg-background data-[hovered]:bg-accent data-[hovered]:text-accent-foreground",
      secondary:
        "bg-secondary text-secondary-foreground data-[hovered]:bg-secondary/80",
      ghost: "data-[hovered]:bg-accent data-[hovered]:text-accent-foreground",
      link: "text-primary underline-offset-4 data-[hovered]:underline",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "size-10",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});
