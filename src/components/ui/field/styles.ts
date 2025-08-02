import { tv } from "@/lib/utils";

export const FieldStyles = tv({
  slots: {
    field: "",
    label: [
      "text-sm font-medium leading-none",
      /* Disabled */
      "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70",
      /* Invalid */
      "group-data-[invalid]:text-critical",
    ],
    description: "text-sm fg-muted",
    error: "text-sm font-medium text-critical",
  },
  variants: {
    variant: {
      default: {
        field: [
          "relative flex h-10 w-full items-center overflow-hidden rounded-sm bg-surface px-3 py-2 text-sm ring-offset-background",
          /* Focus Within */
          "data-[focus-within]:outline-none data-[focus-within]:ring-2 data-[focus-within]:ring-ring data-[focus-within]:ring-offset-2",
          /* Disabled */
          "data-[disabled]:opacity-50",
        ],
      },
      ghost: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});
