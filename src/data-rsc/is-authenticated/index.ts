import { getUserProfile } from "@/data-rsc/get-user-profile";
import { cache } from "react";

export const getRoles = cache(async () => {
  const profile = await getUserProfile();
  return profile?.profile.me.roles ?? [];
});

export const isAuthenticated = async () => {
  return hasRole("USER");
};

export const isDeveloper = async () => {
  return hasRole("DEVELOPER");
};

export const hasRole = async (role: string) => {
  return (await getRoles()).includes(role);
};
