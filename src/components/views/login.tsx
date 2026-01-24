"use client";

import { doLogin } from "@/app/(public)/constants";
import { Button } from "@heroui/react";

export default function Login() {
  return (
    <>
      <h1 className="text-xl">Brenna&apos;s Food Software</h1>
      <Button onPress={doLogin}>Login with Google</Button>
      <p>
        Brenna&apos;s Food Software is a recipe library, meal planner, and
        digital shopping list. At the store with your partner or kids? Split up,
        without tearing the list in half. Preparing a holiday meal? Organize the
        tasks so the day - the prep at least - is stress-free.
      </p>
      <p>Happy cooking!</p>
    </>
  );
}
