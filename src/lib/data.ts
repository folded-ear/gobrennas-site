import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export const verifyToken = cache(async () => {
  const cookie = (await cookies()).get("FTOKEN")?.value;
  console.log(cookie);

  if (!cookie) {
    redirect("/login");
  }

  return { isAuthed: true, userId: "123" };
});
