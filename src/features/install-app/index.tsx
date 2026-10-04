"use client";

import { usePageEngine, usePageStatus } from "@/features/page-engine";
import { Button } from "@heroui/react";
import { useSyncExternalStore } from "react";
import { installOffer } from "./install-offer";

const COARSE_POINTER = "(pointer: coarse)";
const STANDALONE_DISPLAY = "(display-mode: standalone)";
const IOS_DEVICE = /iPad|iPhone|iPod/;

const matches = (query: string) => window.matchMedia(query).matches;

const isIos = () =>
  IOS_DEVICE.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

const noSubscription = () => () => {};

const useMounted = () =>
  useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );

/** I offer to install the app on touch devices that haven't yet. */
export function InstallApp() {
  const mounted = useMounted();
  const { installable: canPrompt } = usePageStatus();
  const engine = usePageEngine();
  if (!mounted) return null;

  const offer = installOffer({
    coarse: matches(COARSE_POINTER),
    standalone: matches(STANDALONE_DISPLAY),
    ios: isIos(),
    canPrompt,
  });

  if (offer === "prompt") {
    return (
      <Button variant="secondary" onPress={engine.install}>
        Install app
      </Button>
    );
  }
  if (offer === "ios") {
    return <p>To install, tap the Share button, then Add to Home Screen.</p>;
  }
  return null;
}
