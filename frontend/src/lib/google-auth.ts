/**
 * Google sign-in is optional. Leave NEXT_PUBLIC_GOOGLE_CLIENT_ID unset and the
 * app falls back to email and password only, which is what a local instance
 * normally wants. To enable it, create an OAuth client in your own Google Cloud
 * project and set this variable on the frontend and GOOGLE_CLIENT_ID on the
 * backend to the same value.
 */
export const GOOGLE_CLIENT_ID = (
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""
).trim();

export const isGoogleAuthConfigured = GOOGLE_CLIENT_ID.length > 0;
