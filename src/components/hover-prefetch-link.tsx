"use client";

import Link from "next/link";
import { type ComponentProps, useEffect, useState } from "react";

const LOG_TAG = "[HoverPrefetchLink]";

type HoverPrefetchLinkProps = Omit<
  ComponentProps<typeof Link>,
  "href" | "prefetch"
> & {
  href: string;
};

/**
 * I am a Link that prefetches only once hovered. I log my href when I mount,
 * each time I'm hovered, and when I first allow prefetching.
 */
export function HoverPrefetchLink({
  href,
  onMouseEnter,
  ...props
}: HoverPrefetchLinkProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    console.log(LOG_TAG, "mount", href);
  }, [href]);

  return (
    <Link
      {...props}
      href={href}
      prefetch={active ? null : false}
      onMouseEnter={(event) => {
        console.log(LOG_TAG, "hover", href);
        if (!active) {
          console.log(LOG_TAG, "prefetch", href);
          setActive(true);
        }
        onMouseEnter?.(event);
      }}
    />
  );
}
