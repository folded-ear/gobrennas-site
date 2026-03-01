import { clsx } from "clsx";
import Link from "next/link";
import { PropsWithChildren } from "react";

type NavLinkProps = PropsWithChildren & {
  href: string;
  isActive?: boolean;
};

export const NavLink = ({ children, href, isActive }: NavLinkProps) => {
  return (
    <Link
      href={href}
      className={clsx(
        "flex gap-2 items-center text-sm transition-colors hover:text-accent",
        isActive && `text-accent/80`,
      )}
    >
      {children}
    </Link>
  );
};
