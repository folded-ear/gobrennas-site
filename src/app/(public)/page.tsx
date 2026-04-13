import { Login } from "@/components/login";
import { isAuthenticated } from "@/data-rsc/is-authenticated";
import { redirect } from "next/navigation";

export default async function Home() {
  if (await isAuthenticated()) redirect("/recipes");
  return <Login />;
}
