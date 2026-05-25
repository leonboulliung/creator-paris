import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureProfile } from "@/lib/server/profile";
import { supabaseAdmin } from "@/lib/supabase";

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/i;
const URL_RE = /^https?:\/\//i;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const profile = await ensureProfile(userId);
  return NextResponse.json({ ok: true, profile });
}

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

  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    displayName?: string;
    socials?: Record<string, string>;
    interests?: string[];
  };

  const patch: Record<string, unknown> = {};

  // Accept either `username` or legacy `displayName` — both map to the
  // display_name column, which we now use as the user-picked handle.
  const handle = (body.username ?? body.displayName ?? "").trim();
  if (handle) {
    if (!USERNAME_RE.test(handle)) {
      return NextResponse.json({ error: "invalid_username" }, { status: 400 });
    }
    patch.display_name = handle.toLowerCase();
  }

  if (body.socials && typeof body.socials === "object") {
    // sanitize: strip @ prefixes for handles, validate URLs lightly
    const s: Record<string, string> = {};
    const setHandle = (k: string) => {
      const v = body.socials?.[k];
      if (typeof v !== "string") return;
      const cleaned = v.trim().replace(/^@/, "").slice(0, 64);
      if (cleaned) s[k] = cleaned;
    };
    setHandle("instagram");
    setHandle("telegram");
    setHandle("whatsapp");
    const site = body.socials.site?.trim().slice(0, 200);
    if (site && URL_RE.test(site)) s.site = site;
    patch.socials = Object.keys(s).length ? s : null;
  }

  if (Array.isArray(body.interests)) {
    const ALLOWED = new Set([
      "film", "music", "build", "sport", "food", "art", "walk", "read", "talk",
    ]);
    const cleaned = body.interests
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.toLowerCase())
      .filter((v) => ALLOWED.has(v));
    patch.interests = cleaned.length ? Array.from(new Set(cleaned)) : null;
  }

  if (!Object.keys(patch).length) return NextResponse.json({ ok: true });

  const { error } = await supabaseAdmin()
    .from("profiles")
    .update(patch)
    .eq("id", userId);
  if (error) {
    if (error.code === "23505") {
      // unique violation if we ever enforce uniqueness
      return NextResponse.json({ error: "username_taken" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
