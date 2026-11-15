import { HoverPrefetchLink } from "@/components/hover-prefetch-link";
import { CookIcon } from "@/components/icons";

type CookIconLinkProps = {
  href: string;
  /** What the link cooks, so it can say so. */
  label: string;
};

/** I link to a cook view, boxed like the buttons beside me. */
export function CookIconLink({ href, label }: CookIconLinkProps) {
  return (
    <HoverPrefetchLink
      href={href}
      className="item-button text-primary hover:bg-default"
    >
      <CookIcon aria-hidden="true" />
      <span className="sr-only">Cook {label}</span>
    </HoverPrefetchLink>
  );
}
