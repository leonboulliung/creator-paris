import type { MetadataRoute } from "next";
import { fetchActiveCards } from "@/lib/db";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://creator-paris.vercel.app";

// Dynamic sitemap: the home page, every active Thing, and the public
// profile of each Thing's creator. Cards are ephemeral (they expire), so
// we only surface what's currently live — the freshest crawlable content.
// Revalidated hourly so we don't hammer the DB on every crawl.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
  ];

  let cards: Awaited<ReturnType<typeof fetchActiveCards>> = [];
  try {
    cards = await fetchActiveCards();
  } catch {
    return base;
  }

  const cardUrls: MetadataRoute.Sitemap = cards.map((c) => ({
    url: `${SITE_URL}/post/${c.id}`,
    lastModified: new Date(c.createdAt),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Unique creator profiles among the active cards.
  const ownerIds = Array.from(new Set(cards.map((c) => c.ownerId)));
  const profileUrls: MetadataRoute.Sitemap = ownerIds.map((id) => ({
    url: `${SITE_URL}/u/${id}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...base, ...cardUrls, ...profileUrls];
}
