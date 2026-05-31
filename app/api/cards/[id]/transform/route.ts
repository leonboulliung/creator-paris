import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

// Hard ceiling mirrors POST /api/cards — a thing starts within 30 days.
const MAX_LEAD_MS = 30 * 86_400_000;
const MIN_LEAD_MS = 5 * 60_000;

/**
 * The transformation: idea → thing. A deliberate human act, owner-only.
 *
 * The author promotes their idea into a concrete, joinable thing. Everyone
 * who signalled resonance is carried over as the warm first crew — written
 * into `join_requests` so the author keeps a light gate (accept/decline) and
 * the signalers see a pending invite on the new thing. Resonance becomes
 * reality.
 *
 * We mutate the SAME row in place (keep its id, so existing /post/[id] links
 * and OG metadata survive) — only `kind` and the concrete fields change.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();

  const { data: card } = await admin
    .from("cards")
    .select("id, owner_id, kind, archived, location, title")
    .eq("id", params.id)
    .maybeSingle();
  if (!card) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (card.owner_id !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (card.kind !== "idea")
    return NextResponse.json({ error: "not_an_idea" }, { status: 400 });
  if (card.archived)
    return NextResponse.json({ error: "archived" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as {
    location?: { lat: number; lng: number; label: string } | null;
    spots?: number;
    permission?: "public" | "request";
    startsAt?: string;
    endsAt?: string | null;
  };

  // Location: use the supplied one, else fall back to the idea's loose location.
  let location = card.location as { lat: number; lng: number; label: string } | null;
  if (
    body.location &&
    typeof body.location.lat === "number" &&
    typeof body.location.lng === "number" &&
    body.location.label
  ) {
    location = {
      lat: body.location.lat,
      lng: body.location.lng,
      label: String(body.location.label).slice(0, 160),
    };
  }
  if (!location) {
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

  const spots = Math.max(1, Math.min(99, Math.floor(body.spots || 1)));
  const permission = body.permission === "request" ? "request" : "public";

  // One live thing per person: archive any OTHER active thing this user owns
  // (not this row — it's about to become the live thing).
  await admin
    .from("cards")
    .update({ archived: true })
    .eq("owner_id", userId)
    .eq("kind", "thing")
    .eq("archived", false)
    .neq("id", params.id);

  // Flip the idea into a thing, in place.
  const { error: upErr } = await admin
    .from("cards")
    .update({
      kind: "thing",
      location,
      spots,
      permission,
      duration_days: 1,
      expires_at: new Date(startsMs).toISOString(),
      ends_at: endsMs ? new Date(endsMs).toISOString() : null,
    })
    .eq("id", params.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Carry the warm crew: every signaler becomes an invited member.
  // Written as join_requests so the author keeps a light accept/decline gate
  // and signalers get a pending invite. The owner never invites themselves.
  const { data: signalRows } = await admin
    .from("signals")
    .select("user_id")
    .eq("card_id", params.id);

  const invited = (signalRows || [])
    .map((s) => s.user_id as string)
    .filter((uid) => uid && uid !== userId);

  if (invited.length > 0) {
    await admin
      .from("join_requests")
      .upsert(
        invited.map((user_id) => ({ card_id: params.id, user_id })),
        { onConflict: "card_id,user_id" },
      );
  }

  // Signals have served their purpose; clear them so the now-thing reads as
  // an event with a crew, not an idea with resonance.
  await admin.from("signals").delete().eq("card_id", params.id);

  return NextResponse.json({
    ok: true,
    id: params.id,
    kind: "thing",
    invitedCount: invited.length,
  });
}
