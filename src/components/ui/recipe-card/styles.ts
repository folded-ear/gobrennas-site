import { tv } from "@/lib/utils";

export const RecipeCardStyles = tv({
  slots: {
    card: [
      "bg-surface text-fg-default rounded-sm outline outline-outline shadow-sm",
      "flex flex-col",
    ],
    content: "px-6",
    description: "text-muted-foreground text-sm",
    footer: "flex items-center px-6 [.border-t]:pt-6",
    header: "",
    title: "font-semibold",
  },
  variants: {
    size: {
      micro: {
        card: "min-w-[150px] max-w-[250px] h-full",
      },
      standard: {
        card: "min-w-[220px] lg:max-w-[280px] md:max-w-[280px] h-full",
      },
    },
  },
});
