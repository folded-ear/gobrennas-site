import BarePage from "@/components/ui/layout/bare-page";
import Login from "@/components/views/login";
import { isAuthenticated } from "@/data-rsc/is-authenticated";
import { redirect } from "next/navigation";

export default async function Home() {
  if (await isAuthenticated()) redirect("/recipes");
  return (
    <BarePage>
      <Login />
    </BarePage>
  );
}
