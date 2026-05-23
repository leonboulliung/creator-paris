"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

async function downscaleToBlob(file: File, max = 512, quality = 0.88): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const side = Math.min(w, h);

  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  tmp.getContext("2d")!.drawImage(bmp, 0, 0, w, h);

  const sq = document.createElement("canvas");
  sq.width = max;
  sq.height = max;
  sq.getContext("2d")!.drawImage(tmp, (w - side) / 2, (h - side) / 2, side, side, 0, 0, max, max);

  return new Promise<Blob>((res, rej) => {
    sq.toBlob((b) => (b ? res(b) : rej(new Error("blob failed"))), "image/jpeg", quality);
  });
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <OnboardingInner />
    </Suspense>
  );
}

function OnboardingInner() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [name, setName] = useState("");
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (user.firstName && !name) setName(user.firstName);
  }, [isLoaded, user, router, name]);

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      setError("Pick an image file.");
      return;
    }
    setError("");
    try {
      const blob = await downscaleToBlob(f, 512, 0.88);
      if (preview) URL.revokeObjectURL(preview);
      setAvatarBlob(blob);
      setPreview(URL.createObjectURL(blob));
    } catch {
      setError("Couldn't process that image.");
    }
  }

  async function submit() {
    if (!user) return;
    const trimmed = name.trim().slice(0, 40);
    if (!trimmed || !avatarBlob) return;
    setSubmitting(true);
    setError("");
    try {
      const file = new File([avatarBlob], "avatar.jpg", { type: "image/jpeg" });
      await user.setProfileImage({ file });
      await user.update({ firstName: trimmed });
      // Sync display_name + avatar URL to Supabase profile row
      await fetch("/api/profile/me", { method: "POST" });
      await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: trimmed }),
      });
      router.replace(next);
      router.refresh();
    } catch (e) {
      setError((e as Error).message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !!name.trim() && !!avatarBlob && !submitting;

  if (!isLoaded || !user) {
    return <div className="min-h-screen bg-paper" />;
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="border-b border-ink px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="block w-2.5 h-2.5 bg-ink rounded-full" />
          <span className="font-black tracking-tightest text-[17px] leading-none">
            CREATOR<span className="opacity-60">.</span>PARIS
          </span>
        </Link>
        <div className="mono text-[10px] tracking-widest opacity-60">STEP 3 / 3 · NAME + FACE</div>
      </div>

      <div className="flex-1 px-6 py-10 max-w-xl w-full mx-auto">
        <div className="mono text-[10px] tracking-widest opacity-60">
          ALMOST IN. {user.primaryEmailAddress?.emailAddress?.toUpperCase() || "EMAIL VERIFIED"}
        </div>
        <h1 className="editorial font-black text-[44px] sm:text-[64px] mt-3 leading-[0.92]">
          Show your face.<br />
          Pick a name.
        </h1>
        <p className="mono text-[12px] mt-4 max-w-md opacity-70">
          The people you join will see both. Just a first name — no last name,
          no real-name requirement.
        </p>

        <div className="mt-10 space-y-6">
          <div>
            <label className="mono text-[10px] tracking-widest opacity-70">NAME</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Léo, Mira, JC, …"
              className="input mt-1"
              maxLength={40}
            />
            <p className="mono text-[10px] opacity-50 mt-1">
              {name.trim().length}/40 · this is your name across the city layer
            </p>
          </div>

          <div>
            <label className="mono text-[10px] tracking-widest opacity-70">PROFILE PICTURE</label>
            <div className="mt-2 flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-28 h-28 border border-ink overflow-hidden bg-white relative group"
                aria-label="Upload profile picture"
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="mono text-[10px] opacity-60">UPLOAD</span>
                )}
                <span className="absolute inset-0 bg-ink/80 text-paper mono text-[10px] tracking-widest flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  {preview ? "REPLACE" : "PICK"}
                </span>
              </button>
              <div className="mono text-[11px] opacity-70 leading-relaxed">
                Square crop · 512 px · jpeg.<br />
                Stored on Clerk — replaces auto-generated default.
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={onPickAvatar}
              className="hidden"
            />
          </div>

          {error && (
            <p className="mono text-[11px] text-red-700">{error.toUpperCase()}</p>
          )}

          <button
            onClick={submit}
            disabled={!canSubmit}
            className={`btn w-full ${!canSubmit ? "opacity-40" : ""}`}
          >
            {submitting ? "Saving…" : "Enter Paris →"}
          </button>

          <div className="mono text-[10px] opacity-50 text-center pt-2">
            BY CONTINUING, YOU CONFIRM YOU CAN POST ONE THING PER WEEK.
          </div>
        </div>
      </div>
    </div>
  );
}
