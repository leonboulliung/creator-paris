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
      title: "Not found · Creator.Paris",
      robots: { index: false, follow: false },
    };
  }

  const isIdea = card.kind === "idea";
  const where = card.location?.label;
  const tagLine = card.tags?.length ? ` · ${card.tags.map((t) => `#${t}`).join(" ")}` : "";

  // Per-item OG is the cold-start recruiter: each idea/thing is a self-contained
  // landing page that sells itself. Idea copy invites resonance; thing copy
  // invites joining.
  const fallback = isIdea
    ? `An idea for Paris${where ? ` near ${where}` : ""}. ${card.signals.length} ${card.signals.length === 1 ? "person wants" : "people want"} this real. Resonate on Creator.Paris.`
    : `A thing${where ? ` in ${where}` : ""}, Paris. ${card.joiners.length}/${card.spots ?? "—"} people. Join on Creator.Paris.`;
  const description = (card.description?.trim() || fallback).slice(0, 200) + tagLine;

  const kindWord = isIdea ? "Idea" : "Thing";
  const title = `${card.title} · ${where ? `${where} · ` : ""}${kindWord} · Creator.Paris`;
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
