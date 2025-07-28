"use client";

import { GOOGLE_AUTH_URL } from "@/app/(public)/constants";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Login() {
  return (
    <div className="bg-surface p-lg rounded-sm">
      <h1>Brenna's Food Software</h1>
      <p>
        Brenna's Food Software is a recipe library, meal planner, and digital
        shopping list. At the store with your partner or kids? Split up, without
        tearing the list in half. Preparing a holiday meal? Organize the tasks
        so the day - the prep at least - is stress-free.
      </p>
      <p>Happy cooking!</p>
      <Button asChild>
        <Link href={GOOGLE_AUTH_URL}>Login</Link>
      </Button>
    </div>
  );
}
