import { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

// Only the pages that make sense to index on a self-hosted instance. The
// workspace app itself sits behind a login and is left out.
const paths = ["", "/docs", "/login", "/signup"];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({
    url: `${siteUrl()}${path || "/"}`,
    lastModified: new Date(),
    changeFrequency: path === "/docs" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
