import { Suspense } from "react";
import type { Metadata } from "next";
import { fetchCardById } from "@/lib/db";
import { PostDetail } from "./PostDetail";

// Per-card SEO + social metadata. Runs on the server so crawlers and
// link-unfurlers (WhatsApp, Slack, iMessage, Twitter…) see real titles
// and descriptions. No generated image — text metadata from existing data.
export async function generateMetadata(
  { params }: { params: { id: string } },
): Promise<Metadata> {
  const card = await fetchCardById(params.id).catch(() => null);

  if (!card) {
    return {
      title: "Card not found · Creator.Paris",
      robots: { index: false, follow: false },
    };
  }

  const where = card.location.label;
  const spots = `${card.joiners.length}/${card.spots} people`;
  const tagLine = card.tags?.length ? ` · ${card.tags.map((t) => `#${t}`).join(" ")}` : "";
  const description =
    (card.description?.trim() ||
      `A thing in ${where}, Paris. ${spots}. Join on Creator.Paris.`).slice(0, 200) +
    tagLine;

  const title = `${card.title} · ${where} · Creator.Paris`;
  const url = `/post/${card.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: card.title,
      description,
      url,
      siteName: "Creator.Paris",
    },
    twitter: {
      card: "summary",
      title: card.title,
      description,
    },
  };
}

export default function PostPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="h-[100dvh] bg-paper" />}>
      <PostDetail id={params.id} />
    </Suspense>
  );
}
