import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://api.dhirajchapagain.com.np";
  const paths = [
    "",
    "/docs",
    "/pricing",
    "/terms",
    "/privacy",
    "/login",
    "/signup",
    "/features/mock-apis",
    "/features/custom-domains",
    "/features/analytics",
    "/features/webhooks",
    "/features/openapi",
    "/features/security",
  ];
  return paths.map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: new Date(),
    changeFrequency: path.startsWith("/docs") || path.startsWith("/features")
      ? "weekly"
      : "monthly",
    priority: path === "" || path.startsWith("/features") ? 1 : 0.6,
  }));
}
