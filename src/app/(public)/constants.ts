"use server";

import { redirect } from "next/navigation";

const OAUTH2_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/post-oauth2/redirect`;

const GOOGLE_AUTH_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/oauth2/authorize/google?redirect_uri=${OAUTH2_REDIRECT_URI}`;

export async function doLogin() {
  redirect(GOOGLE_AUTH_URL);
}

export async function doLogout() {
  // this redirects back to client, not site, as the API only has one publicUrl...
  redirect(`${process.env.NEXT_PUBLIC_API_BASE_URL}/oauth2/logout`);
}
