import { graphqlUri } from "@/constants";
import { Profile } from "@/screens/profile";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Profile",
  description: "...",
};

export default async function ProfilePage() {
  // Use the same runtime server configuration as Apollo. Browser environment
  // variables are frozen at build time and may be absent in promoted images.
  const apiRoot = (await graphqlUri()).replace(/\/graphql$/, "");
  return <Profile apiRoot={apiRoot} />;
}
