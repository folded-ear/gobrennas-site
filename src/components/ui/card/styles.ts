import { tv } from "@/lib/utils";

export const CardStyles = tv({
  slots: {
    card: "bg-surface",
    content: "px-6",
    description: "",
    footer: "",
    header: "",
    title: "",
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
