import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureProfile } from "@/lib/server/profile";
import { newId } from "@/lib/id";
import { normalizeTags } from "@/lib/vibe";

// Hard ceiling: a card may live at most 30 days into the future. Most things
// will be hours or days away — this just prevents pathological inputs.
const MAX_LEAD_MS = 30 * 86_400_000;
const MIN_LEAD_MS = 5 * 60_000; // 5 min minimum into the future

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    title?: string;
    description?: string;
    location?: { lat: number; lng: number; label: string };
    spots?: number;
    permission?: "public" | "request";
    startsAt?: string; // ISO 8601
    endsAt?: string | null;
    externalUrl?: string | null;
    tags?: string[];
    color?: string;
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
  const tags = normalizeTags(body.tags, 5);
  // Accept any CSS-style hex/rgb. Validate loosely to keep schemas honest.
  const colorRaw = (body.color || "").trim();
  const color = /^#([0-9a-fA-F]{3}){1,2}$/.test(colorRaw) ? colorRaw.toLowerCase() : null;
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

  const startsMs = body.startsAt ? Date.parse(body.startsAt) : NaN;
  if (!Number.isFinite(startsMs)) {
    return NextResponse.json({ error: "starts_at_required" }, { status: 400 });
  }
  const now = Date.now();
  if (startsMs < now + MIN_LEAD_MS) {
    return NextResponse.json({ error: "starts_at_too_soon" }, { status: 400 });
  }
  if (startsMs > now + MAX_LEAD_MS) {
    return NextResponse.json({ error: "starts_at_too_far" }, { status: 400 });
  }

  // Optional end time. Must be after start; cap 24h-window after start to
  // keep "things" event-shaped rather than open calendars.
  let endsMs: number | null = null;
  if (body.endsAt) {
    const t = Date.parse(body.endsAt);
    if (Number.isFinite(t)) {
      if (t <= startsMs) {
        return NextResponse.json({ error: "ends_at_before_start" }, { status: 400 });
      }
      if (t > startsMs + 24 * 60 * 60 * 1000) {
        return NextResponse.json({ error: "ends_at_too_far" }, { status: 400 });
      }
      endsMs = t;
    }
  }

  // Optional external URL. We require http(s) so we can render it as a link
  // safely. Other schemes (javascript:, mailto:, data:) are rejected.
  let externalUrl: string | null = null;
  if (typeof body.externalUrl === "string") {
    const u = body.externalUrl.trim().slice(0, 500);
    if (u && /^https?:\/\/[^\s]+$/i.test(u)) externalUrl = u;
  }

  await ensureProfile(userId);
  const admin = supabaseAdmin();

  // Archive any currently active card by this user — the rule is one live card.
  await admin
    .from("cards")
    .update({ archived: true })
    .eq("owner_id", userId)
    .eq("archived", false);

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
      tags,
      color,
      // `expires_at` column is repurposed: it now stores the event START time.
      // Cards auto-archive once this passes — which matches the new rule.
      // `duration_days` is vestigial; we send 1 to satisfy the legacy CHECK.
      duration_days: 1,
      expires_at: new Date(startsMs).toISOString(),
      ends_at: endsMs ? new Date(endsMs).toISOString() : null,
      external_url: externalUrl,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id, card: data });
}
