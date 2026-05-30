import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://creator-paris.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private / non-content surfaces: keep out of the index.
      disallow: ["/api/", "/sign-in", "/sign-up", "/onboarding", "/carnet"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
