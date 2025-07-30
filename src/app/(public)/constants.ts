export const OAUTH2_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/post-oauth2/redirect`;

export const GOOGLE_AUTH_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/oauth2/authorize/google?redirect_uri=${OAUTH2_REDIRECT_URI}`;
