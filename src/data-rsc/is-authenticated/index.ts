import { getUserProfile } from "@/data-rsc/get-user-profile";
import { ROLE_DEVELOPER, ROLE_USER } from "@/lib/roles";
import { cache } from "react";

export const getRoles = cache(async () => {
  const profile = await getUserProfile();
  return profile?.profile.me.roles ?? [];
});

export const isAuthenticated = async () => {
  return hasRole(ROLE_USER);
};

export const isDeveloper = async () => {
  return hasRole(ROLE_DEVELOPER);
};

export const hasRole = async (role: string) => {
  return (await getRoles()).includes(role);
};
