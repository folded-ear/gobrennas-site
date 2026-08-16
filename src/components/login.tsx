"use client";

import { BFSLogo } from "@/components/bfs-logo";
import { doLogin } from "@/constants";
import { Button } from "@heroui/react";

export function Login() {
  return (
    <div className="flex flex-col gap-lg bg-surface p-xl items-center rounded-md max-w-1/2 mx-auto my-4">
      <BFSLogo size="lg" />
      <h1 className="text-xl">Brenna&apos;s Food Software</h1>
      <Button onPress={doLogin}>Login with Google</Button>
      <p className="max-w-3/4">
        Brenna&apos;s Food Software is a recipe library, meal planner, and
        digital shopping list. At the store with your partner or kids? Split up,
        without tearing the list in half. Preparing a holiday meal? Organize the
        tasks so the day - the prep at least - is stress-free.
      </p>
      <p>Happy cooking!</p>
    </div>
  );
}
