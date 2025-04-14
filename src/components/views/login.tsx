"use client";

import { GOOGLE_AUTH_URL } from "@/app/(public)/constants";
import { Header, Link, Text } from "@adobe/react-spectrum";

export default function Login() {
  return (
    <div className="bg-surface p-lg rounded-sm">
      <Header>Brenna's Food Software</Header>
      <Link href={GOOGLE_AUTH_URL}>Login</Link>
      <Text>
        Brenna's Food Software is a recipe library, meal planner, and digital
        shopping list. At the store with your partner or kids? Split up, without
        tearing the list in half. Preparing a holiday meal? Organize the tasks
        so the day - the prep at least - is stress-free.
      </Text>
      <Text>Happy cooking!</Text>
    </div>
  );
}
