import BarePage from "@/components/ui/layout/bare-page";
import Login from "@/components/views/login";
import { GET_PROFILE } from "@/data/get-profile";
import { query } from "@/lib/apollo-client";
import { redirect } from "next/navigation";

export default async function Home() {
  let data;
  try {
    data = await query({ query: GET_PROFILE });
  } catch {}
  if (data?.data?.profile.me.email) redirect("/recipes");
  return (
    <BarePage>
      <Login />
    </BarePage>
  );
}
