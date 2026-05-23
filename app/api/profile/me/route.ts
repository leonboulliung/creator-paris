import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureProfile } from "@/lib/server/profile";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const profile = await ensureProfile(userId);
  return NextResponse.json({ ok: true, profile });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await ensureProfile(userId);

  const body = (await req.json().catch(() => ({}))) as { displayName?: string };
  const patch: Record<string, string> = {};
  if (typeof body.displayName === "string") {
    const v = body.displayName.trim().slice(0, 60);
    if (v) patch.display_name = v;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ ok: true });

  const { error } = await supabaseAdmin()
    .from("profiles")
    .update(patch)
    .eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
