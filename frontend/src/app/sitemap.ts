import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://api.dhirajchapagain.com.np";
  const paths = ["", "/docs", "/pricing", "/terms", "/privacy", "/login", "/signup"];
  return paths.map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: new Date(),
    changeFrequency: path.startsWith("/docs") ? "weekly" : "monthly",
    priority: path === "" || path === "/docs" ? 1 : 0.6,
  }));
}
