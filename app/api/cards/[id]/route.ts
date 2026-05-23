import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

async function loadOwned(id: string, userId: string) {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("cards")
    .select("id, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  if (data.owner_id !== userId)
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { admin };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const guard = await loadOwned(params.id, userId);
  if (guard.error) return guard.error;

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    description?: string;
    spots?: number;
    permission?: "public" | "request";
  };

  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.description === "string") patch.description = body.description.trim();
  if (typeof body.spots === "number")
    patch.spots = Math.max(1, Math.min(99, Math.floor(body.spots)));
  if (body.permission === "public" || body.permission === "request")
    patch.permission = body.permission;

  if (!Object.keys(patch).length) return NextResponse.json({ ok: true });

  const { error } = await guard.admin.from("cards").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const guard = await loadOwned(params.id, userId);
  if (guard.error) return guard.error;

  const { error } = await guard.admin.from("cards").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
