import { CookIcon } from "@/components/icons";
import Link from "next/link";

type CookIconLinkProps = {
  href: string;
  /** What the link cooks, so it can say so. */
  label: string;
};

/** I link to a cook view, boxed like the buttons beside me. */
export function CookIconLink({ href, label }: CookIconLinkProps) {
  return (
    <Link href={href} className="item-button text-primary hover:bg-default">
      <CookIcon aria-hidden="true" />
      <span className="sr-only">Cook {label}</span>
    </Link>
  );
}
