import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureProfile } from "@/lib/server/profile";

// POST = follow params.userId. Idempotent.
export async function POST(_req: Request, { params }: { params: { userId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const target = params.userId;
  if (target === userId)
    return NextResponse.json({ error: "cant_follow_self" }, { status: 400 });

  await ensureProfile(userId);
  const admin = supabaseAdmin();

  // Target must be a real profile.
  const { data: prof } = await admin
    .from("profiles")
    .select("id")
    .eq("id", target)
    .maybeSingle();
  if (!prof) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { error } = await admin
    .from("follows")
    .upsert(
      { follower_id: userId, following_id: target },
      { onConflict: "follower_id,following_id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: "following" });
}

// DELETE = unfollow params.userId.
export async function DELETE(_req: Request, { params }: { params: { userId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = supabaseAdmin();
  await admin
    .from("follows")
    .delete()
    .eq("follower_id", userId)
    .eq("following_id", params.userId);
  return NextResponse.json({ ok: true, status: "unfollowed" });
}
