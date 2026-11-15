import { HoverPrefetchLink } from "@/components/hover-prefetch-link";
import { LibraryIcon } from "@/components/icons";
import { buttonVariants } from "@heroui/react";

type LibraryLinkProps = {
  recipeId: string;
};

export function LibraryLink({ recipeId }: LibraryLinkProps) {
  return (
    <HoverPrefetchLink
      href={`/recipes/${recipeId}`}
      className={buttonVariants({
        variant: "tertiary",
        size: "sm",
        className: "h-7 shrink-0 gap-xs px-sm text-xs",
      })}
    >
      <LibraryIcon size="small" aria-hidden="true" />
      Open in Library
    </HoverPrefetchLink>
  );
}
