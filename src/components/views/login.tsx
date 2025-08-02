"use client";

import { GOOGLE_AUTH_URL } from "@/app/(public)/constants";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Login() {
  return (
    <div className="flex flex-col gap-lg bg-surface p-lg items-center rounded-md max-w-2/3 mx-auto">
      <h1 className="text-xl">Brenna's Food Software</h1>
      <Button className="w-fit" variant="outline">
        <Link href={GOOGLE_AUTH_URL}>Login with Google</Link>
      </Button>
      <p>
        Brenna's Food Software is a recipe library, meal planner, and digital
        shopping list. At the store with your partner or kids? Split up, without
        tearing the list in half. Preparing a holiday meal? Organize the tasks
        so the day - the prep at least - is stress-free.
      </p>
      <p>Happy cooking!</p>
    </div>
  );
}
