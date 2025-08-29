"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

// TODO: replace this with server side auth
function Body() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      router.replace("/recipes");
    } else {
      router.replace("/");
    }
  }, [router, token]);

  return null;
}
export default function Redirect() {
  return (
    <Suspense>
      <Body />
    </Suspense>
  );
}
