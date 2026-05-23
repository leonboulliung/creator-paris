import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

async function loadOwned(cardId: string, ownerId: string) {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("cards")
    .select("id, owner_id")
    .eq("id", cardId)
    .maybeSingle();
  if (!data) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  if (data.owner_id !== ownerId)
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { admin };
}

// Owner sets the custom role label on a joiner.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; userId: string } },
) {
  const { userId: actorId } = await auth();
  if (!actorId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const guard = await loadOwned(params.id, actorId);
  if (guard.error) return guard.error;

  const body = (await req.json().catch(() => ({}))) as { role?: string };
  const role = (body.role || "").trim().slice(0, 40);

  const { error } = await guard.admin
    .from("joiners")
    .update({ role })
    .eq("card_id", params.id)
    .eq("user_id", params.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Owner removes a joiner.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; userId: string } },
) {
  const { userId: actorId } = await auth();
  if (!actorId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const guard = await loadOwned(params.id, actorId);
  if (guard.error) return guard.error;

  const { error } = await guard.admin
    .from("joiners")
    .delete()
    .eq("card_id", params.id)
    .eq("user_id", params.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
