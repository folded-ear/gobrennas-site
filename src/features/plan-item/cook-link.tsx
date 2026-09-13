import Link from "next/link";

type CookLinkProps = {
  planId: string;
  itemId: string;
  /** The item's name, so the link says what it cooks. */
  name: string;
};

/** I give the path to one plan item's cook view. */
export function cookHref(planId: string, itemId: string) {
  return `/plan/${planId}/recipe/${itemId}`;
}

/** I link to a plan item's cook view, loudly. */
export function CookLink({ planId, itemId, name }: CookLinkProps) {
  return (
    <Link
      href={cookHref(planId, itemId)}
      className="shrink-0 animate-pulse rounded-full bg-danger px-sm text-xs font-bold uppercase text-danger-foreground shadow-md"
    >
      Cook<span className="sr-only"> {name}</span>
    </Link>
  );
}
