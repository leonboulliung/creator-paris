import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureProfile } from "@/lib/server/profile";
import { newId } from "@/lib/id";

const ALLOWED_DURATIONS = new Set([1, 3, 7]);

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    title?: string;
    description?: string;
    location?: { lat: number; lng: number; label: string };
    spots?: number;
    permission?: "public" | "request";
    durationDays?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const title = (body.title || "").trim();
  const description = (body.description || "").trim();
  const spots = Math.max(1, Math.min(99, Math.floor(body.spots || 1)));
  const permission = body.permission === "request" ? "request" : "public";
  const durationDays = body.durationDays && ALLOWED_DURATIONS.has(body.durationDays) ? body.durationDays : 3;
  const location = body.location;

  if (!title) return NextResponse.json({ error: "title_required" }, { status: 400 });
  if (
    !location ||
    typeof location.lat !== "number" ||
    typeof location.lng !== "number" ||
    !location.label
  ) {
    return NextResponse.json({ error: "location_required" }, { status: 400 });
  }

  await ensureProfile(userId);
  const admin = supabaseAdmin();

  // Archive any currently active card by this user — the rule is one live card.
  await admin
    .from("cards")
    .update({ archived: true })
    .eq("owner_id", userId)
    .eq("archived", false);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 86_400_000);
  const id = newId();

  const { data, error } = await admin
    .from("cards")
    .insert({
      id,
      owner_id: userId,
      title,
      description,
      location,
      spots,
      permission,
      duration_days: durationDays,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id, card: data });
}
