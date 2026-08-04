import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/docs", "/docs/", "/llms.txt", "/llms-full.txt", "/pricing", "/terms", "/privacy"],
      disallow: ["/api/"],
    },
    sitemap: "https://api.dhirajchapagain.com.np/sitemap.xml",
  };
}
