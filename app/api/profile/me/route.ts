import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureProfile } from "@/lib/server/profile";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeTags } from "@/lib/vibe";

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/i;
const URL_RE = /^https?:\/\//i;
const USERNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
  const current = await ensureProfile(userId);

  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    displayName?: string;
    socials?: Record<string, string>;
    interests?: string[];
    bio?: string | null;
  };

  const patch: Record<string, unknown> = {};
  let usernameChanging = false;

  // Accept either `username` or legacy `displayName` — both map to the
  // display_name column, which we now use as the user-picked handle.
  const handle = (body.username ?? body.displayName ?? "").trim().toLowerCase();
  if (handle) {
    if (!USERNAME_RE.test(handle)) {
      return NextResponse.json({ error: "invalid_username" }, { status: 400 });
    }

    const existingName = String(current.display_name ?? "").toLowerCase();
    if (handle !== existingName) {
      // 1× pro Woche cooldown — only enforced when the name actually changes.
      const lastChanged = current.username_changed_at
        ? new Date(current.username_changed_at).getTime()
        : 0;
      const nextAllowed = lastChanged + USERNAME_COOLDOWN_MS;
      if (lastChanged && Date.now() < nextAllowed) {
        return NextResponse.json(
          {
            error: "username_cooldown",
            nextChangeAt: new Date(nextAllowed).toISOString(),
          },
          { status: 429 },
        );
      }
      patch.display_name = handle;
      patch.username_changed_at = new Date().toISOString();
      usernameChanging = true;
    }
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
    // Free-form tags. Cap at 10 so profiles stay readable.
    const cleaned = normalizeTags(body.interests, 10);
    patch.interests = cleaned.length ? cleaned : null;
  }

  if (typeof body.bio === "string") {
    const cleaned = body.bio.trim().slice(0, 200);
    patch.bio = cleaned.length ? cleaned : null;
  } else if (body.bio === null) {
    patch.bio = null;
  }

  if (!Object.keys(patch).length) return NextResponse.json({ ok: true });

  const { error } = await supabaseAdmin()
    .from("profiles")
    .update(patch)
    .eq("id", userId);
  if (error) {
    if (error.code === "23505") {
      // Unique-violation on lower(display_name).
      return NextResponse.json({ error: "username_taken" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, usernameChanged: usernameChanging });
}
