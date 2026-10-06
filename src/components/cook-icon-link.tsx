import { CookIcon } from "@/components/icons";
import { LINE_CONTROL_CLASS_NAME } from "@/components/line-control";
import clsx from "clsx";
import Link from "next/link";

type CookIconLinkProps = {
  href: string;
  /** What the link cooks, so it can say so. */
  label: string;
};

/** I link to a cook view, boxed like the buttons beside me. */
export function CookIconLink({ href, label }: CookIconLinkProps) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center justify-center rounded-sm text-primary hover:bg-default",
        LINE_CONTROL_CLASS_NAME,
      )}
    >
      <CookIcon size="small" aria-hidden="true" />
      <span className="sr-only">Cook {label}</span>
    </Link>
  );
}
