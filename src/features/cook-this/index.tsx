"use client";

import { useCookies } from "next-client-cookies";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { bookmarkletUrl } from "./bookmarklet";

const noSubscription = () => () => {};

function apiProtocol(apiRoot?: string) {
  try {
    const protocol = new URL(apiRoot ?? "").protocol;
    return protocol === "http:" || protocol === "https:" ? protocol : undefined;
  } catch {
    return undefined;
  }
}

export function CookThis({ apiRoot }: { apiRoot?: string }) {
  const cookies = useCookies();
  const mounted = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const token = mounted ? cookies.get("FTOKEN") : undefined;
  const protocol = apiProtocol(apiRoot);
  const needsToken = protocol === "http:";
  const disabled = !mounted || !protocol || (needsToken && !token);
  const label =
    process.env.NODE_ENV === "production" ? "Cook This" : "DEV Cook This";
  const link = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // React blocks javascript: href props. A bookmarklet deliberately needs
    // one as its native drag target; build it only from our configuration.
    if (disabled || !apiRoot) {
      link.current?.removeAttribute("href");
      return;
    }
    link.current?.setAttribute(
      "href",
      bookmarkletUrl(window.location.origin, apiRoot, token),
    );
  }, [apiRoot, disabled, token]);

  return (
    <section
      id="cook-this"
      aria-labelledby="cook-this-title"
      className="flex max-w-lg flex-col gap-sm"
    >
      <h2 id="cook-this-title">Cook This</h2>
      <p>
        Drag Cook This to your browser’s bookmarks bar. When viewing a recipe
        online, click the bookmark to review and import it into your Library.
      </p>
      <a
        ref={link}
        role={disabled ? "link" : undefined}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        draggable={!disabled}
        aria-describedby="cook-this-help"
        onDragStart={(event) => {
          if (disabled) event.preventDefault();
        }}
        className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50 w-fit rounded-lg bg-accent px-lg py-sm font-semibold text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        onClick={(event) => event.preventDefault()}
      >
        {label}
      </a>
      {!protocol && (
        <p role="status">
          Cook This is unavailable because the API address is not configured
          correctly.
        </p>
      )}
      {needsToken && !token && mounted && (
        <p role="status">
          Sign in before installing Cook This. With an HTTP API, replace the
          bookmark after signing in again.
        </p>
      )}
      <p id="cook-this-help" className="text-sm text-muted">
        Drag this link rather than clicking it here. You can also copy its link
        address into a bookmark’s URL. If it asks for an update, sign in and
        replace the bookmark from this page.
      </p>
      <p className="text-sm text-muted">
        This bookmark is connected to your account. Keep it private.
      </p>
    </section>
  );
}
