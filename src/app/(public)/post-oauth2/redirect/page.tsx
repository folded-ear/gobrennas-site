"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

// TODO: replace this with server side auth
export default function Redirect() {
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
