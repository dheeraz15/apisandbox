export const APP_NAME = "API Sandbox";

export const APP_DESCRIPTION =
  "Self-hosted mock API server. Define endpoints, give them realistic responses, and call them over HTTP before the real backend exists.";

const DEFAULT_SITE_URL = "http://localhost:3000";

/**
 * Public URL this instance is served from, used for canonical links, sitemap
 * and robots.txt. Set NEXT_PUBLIC_SITE_URL when deploying behind a domain;
 * local development does not need it.
 */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, "");
}
