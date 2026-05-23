import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

async function loadOwned(cardId: string, ownerId: string) {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("cards")
    .select("id, owner_id, spots")
    .eq("id", cardId)
    .maybeSingle();
  if (!data) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  if (data.owner_id !== ownerId)
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { admin, card: data };
}

// Owner accepts a pending request → move to joiners.
export async function POST(
  _req: Request,
  { params }: { params: { id: string; userId: string } },
) {
  const { userId: actorId } = await auth();
  if (!actorId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const guard = await loadOwned(params.id, actorId);
  if (guard.error) return guard.error;

  const { count } = await guard.admin
    .from("joiners")
    .select("user_id", { head: true, count: "exact" })
    .eq("card_id", params.id);
  if ((count ?? 0) >= guard.card.spots)
    return NextResponse.json({ error: "full" }, { status: 400 });

  await guard.admin
    .from("join_requests")
    .delete()
    .eq("card_id", params.id)
    .eq("user_id", params.userId);
  const { error } = await guard.admin
    .from("joiners")
    .upsert(
      { card_id: params.id, user_id: params.userId },
      { onConflict: "card_id,user_id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Owner declines a pending request.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; userId: string } },
) {
  const { userId: actorId } = await auth();
  if (!actorId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const guard = await loadOwned(params.id, actorId);
  if (guard.error) return guard.error;

  await guard.admin
    .from("join_requests")
    .delete()
    .eq("card_id", params.id)
    .eq("user_id", params.userId);
  return NextResponse.json({ ok: true });
}
