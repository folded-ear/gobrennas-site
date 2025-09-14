import { tv } from "@/lib/utils";

export const ButtonDefaults = {
  variant: "primary",
  size: "md",
} as const;

export const ToggleStyles = tv({
  base: [
    "w-fit inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors",
    "disabled:pointer-events-none disabled:opacity-50 ",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "focus-visible:outline-none",
    "hover:bg-muted hover:text-muted-foreground",
    "selected:bg-accent selected:text-accent-foreground",
  ],
  variants: {
    variant: {
      primary: "bg-bfs fg-default hover:bg-bfs/80",
      destructive: "bg-critical fg-muted hover:bg-critical/90",
      outline:
        "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",
      icon: "size-10",
    },
    size: {
      sm: "h-9 rounded-md px-3",
      md: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
    },
  },
  defaultVariants: ButtonDefaults,
});

export const ToggleGroupStyles = tv({
  base: [
    "group/toggle-group flex items-center justify-center gap-1 vertical:flex-col",
  ],
});
