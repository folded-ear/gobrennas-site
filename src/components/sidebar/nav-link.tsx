import { clsx } from "clsx";
import Link from "next/link";
import { PropsWithChildren } from "react";

type NavLinkProps = PropsWithChildren & {
  href: string;
  isActive?: boolean;
  onClick?: () => void;
};

export const NavLink = ({
  children,
  href,
  isActive,
  onClick,
}: NavLinkProps) => {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        "flex gap-2 items-center text-sm transition-colors hover:text-accent",
        isActive && `text-accent/80`,
      )}
    >
      {children}
    </Link>
  );
};
