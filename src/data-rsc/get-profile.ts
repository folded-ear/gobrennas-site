import { GET_PROFILE } from "@/data/get-profile";
import { query } from "@/lib/apollo-rsc";
import { cache } from "react";

export const getProfile = async () => {
  const profile = getOptionalProfile();
  if (!profile) throw new TypeError(`Failed to get profile`);
  return profile;
};

export const getOptionalProfile = cache(async () => {
  const { data } = await query({ query: GET_PROFILE });
  return data?.profile.me;
});

export const isAuthenticated = async () => {
  return getOptionalProfile() != null;
};
