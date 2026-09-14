import { CookIcon } from "@/components/icons";
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

/** I link to a plan item's cook view. */
export function CookLink({ planId, itemId, name }: CookLinkProps) {
  return (
    <Link
      href={cookHref(planId, itemId)}
      className="shrink-0 rounded-full p-xs text-primary"
    >
      <CookIcon size="small" aria-hidden="true" />
      <span className="sr-only">Cook {name}</span>
    </Link>
  );
}
