import type { Metadata } from "next";
import { fetchProfile, fetchTrackRecord } from "@/lib/db";
import { ProfileView } from "./ProfileView";

// Per-profile SEO + social metadata. Server-rendered so a shared profile
// link unfurls with a real name + bio. No generated image.
export async function generateMetadata(
  { params }: { params: { id: string } },
): Promise<Metadata> {
  const profile = await fetchProfile(params.id).catch(() => null);

  if (!profile) {
    return {
      title: "Profile not found · Creator.Paris",
      robots: { index: false, follow: false },
    };
  }

  const track = await fetchTrackRecord(params.id).catch(() => []);
  const created = track.filter((t) => t.isCreator).length;
  const stats = `${track.length} entries · ${created} created`;
  const description = (
    profile.bio?.trim() ||
    `@${profile.displayName} on Creator.Paris — ${stats}.`
  ).slice(0, 200);

  const title = `@${profile.displayName} · Creator.Paris`;
  const url = `/u/${profile.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      title: `@${profile.displayName}`,
      description,
      url,
      siteName: "Creator.Paris",
      images: profile.avatarUrl ? [{ url: profile.avatarUrl }] : undefined,
    },
    twitter: {
      card: "summary",
      title: `@${profile.displayName}`,
      description,
    },
  };
}

export default function PublicProfilePage({ params }: { params: { id: string } }) {
  return <ProfileView userId={params.id} />;
}
