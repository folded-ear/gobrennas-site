import { Profile } from "@/screens/profile";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Profile",
  description: "...",
};

export default function ProfilePage() {
  return <Profile />;
}
