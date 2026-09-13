"use client";

import { UserAvatarWithFallback } from "@/features/user-avatar";
import { useFragment } from "@apollo/client/react";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SectionNavFragmentDoc } from "./__generated__/sectionNav.generated";
import { SECTIONS } from "./sections";

/**
 * I am the row of links to the app's sections, fixed along the bottom of
 * the screen, marking the section the current page belongs to.
 */
export function SectionNav() {
  const pathname = usePathname() ?? "";
  const { data, complete } = useFragment({
    fragment: SectionNavFragmentDoc,
    fragmentName: "sectionNav",
    from: "ROOT_QUERY",
  });

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-separator bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {SECTIONS.map((section) => {
          const isCurrent = section.matches(pathname);
          return (
            <li key={section.id}>
              <Link
                href={section.href}
                aria-current={isCurrent ? "page" : undefined}
                className={clsx(
                  "flex h-14 flex-col items-center justify-center gap-xxs text-xs transition-colors",
                  isCurrent
                    ? "text-accent"
                    : "text-muted hover:text-foreground",
                )}
              >
                <span aria-hidden className="flex h-7 items-center">
                  {section.icon ?? (
                    <UserAvatarWithFallback
                      user={complete ? data.profile.me : null}
                      size="sm"
                    />
                  )}
                </span>
                <span>{section.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
