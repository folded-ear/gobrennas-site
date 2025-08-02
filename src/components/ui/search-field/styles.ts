import { tv } from "@/lib/utils";

export const SearchFieldStyles = tv({
  slots: {
    search: "group flex flex-col gap-2",
    input:
      "min-w-0 flex-1 px-2 py-1.5 placeholder:fg-muted [&::-webkit-search-cancel-button]:hidden",
    group: [
      "bg-surface flex h-10 w-full items-center overflow-hidden rounded-md px-3 py-2 text-sm ring-offset-background",
      /* Focus Within */
      "data-[focus-within]:outline-none data-[focus-within]:ring-2 data-[focus-within]:ring-ring data-[focus-within]:ring-offset-2",
      /* Disabled */
      "data-[disabled]:opacity-50",
    ],
    clear: [
      "mr-1 rounded-sm opacity-70 ring-offset-background transition-opacity",
      /* Hover */
      "data-[hovered]:opacity-100",
      /* Disabled */
      "data-[disabled]:pointer-events-none",
      /* Empty */
      "group-data-[empty]:invisible",
    ],
  },
});
