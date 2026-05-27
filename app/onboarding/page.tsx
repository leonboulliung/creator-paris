"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { TagInput } from "@/components/TagInput";

const INTEREST_SUGGESTIONS = [
  "film", "music", "art", "fashion", "food", "walks",
  "photography", "design", "books", "build", "sport", "talk",
];

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/i;

async function downscaleToBlob(file: File, max = 512, quality = 0.88): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const side = Math.min(w, h);

  const tmp = document.createElement("canvas");
  tmp.width = w; tmp.height = h;
  tmp.getContext("2d")!.drawImage(bmp, 0, 0, w, h);

  const sq = document.createElement("canvas");
  sq.width = max; sq.height = max;
  sq.getContext("2d")!.drawImage(tmp, (w - side) / 2, (h - side) / 2, side, side, 0, 0, max, max);

  return new Promise<Blob>((res, rej) => {
    sq.toBlob((b) => (b ? res(b) : rej(new Error("blob failed"))), "image/jpeg", quality);
  });
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="h-[100dvh] bg-paper" />}>
      <OnboardingInner />
    </Suspense>
  );
}

function OnboardingInner() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 — username + avatar
  const [username, setUsername] = useState("");
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 2 — socials + interests
  const [instagram, setInstagram] = useState("");
  const [telegram, setTelegram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [site, setSite] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) router.replace("/");
  }, [isLoaded, user, router]);

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

  async function submitStep1() {
    if (!user) return;
    const handle = username.trim().toLowerCase();
    if (!USERNAME_RE.test(handle)) {
      setError("3–32 chars. Letters, numbers, . _ - only.");
      return;
    }
    if (!avatarBlob) {
      setError("Pick a picture.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const file = new File([avatarBlob], "avatar.jpg", { type: "image/jpeg" });
      await user.setProfileImage({ file });
      // username goes to Supabase, not Clerk, to keep Clerk-side config simple
      await fetch("/api/profile/me", { method: "POST" });
      const res = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: handle }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.toString().toUpperCase() || "FAILED");
        return;
      }
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitStep2(skip = false) {
    setSubmitting(true);
    setError("");
    try {
      if (!skip) {
        await fetch("/api/profile/me", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            socials: {
              instagram: instagram.trim(),
              telegram: telegram.trim(),
              whatsapp: whatsapp.trim(),
              site: site.trim(),
            },
            interests,
          }),
        });
      }
      router.replace(next);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoaded || !user) {
    return <div className="h-[100dvh] bg-paper" />;
  }

  const usernameValid = USERNAME_RE.test(username.trim().toLowerCase());
  const canSubmit1 = usernameValid && !!avatarBlob && !submitting;

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="border-b border-ink px-6 py-4 flex items-center justify-between safe-top">
        <Link href="/" className="flex items-center gap-3">
          <span className="cp-pulse-dot" />
          <span className="font-black tracking-tightest text-[17px] leading-none">
            CREATOR<span className="opacity-60">.</span>PARIS
          </span>
        </Link>
        <div className="mono text-[10px] tracking-widest opacity-60">
          STEP {step} / 2 · {step === 1 ? "HANDLE + FACE" : "SOCIALS + INTERESTS"}
        </div>
      </div>

      {step === 1 && (
        <div className="flex-1 px-6 py-10 max-w-xl w-full mx-auto">
          <div className="mono text-[10px] tracking-widest opacity-60">
            ALMOST IN. {user.primaryEmailAddress?.emailAddress?.toUpperCase() || "VERIFIED"}
          </div>
          <h1 className="editorial font-black text-[44px] sm:text-[64px] mt-3 leading-[0.92]">
            Pick a handle.<br />Show your face.
          </h1>
          <p className="mono text-[12px] mt-4 max-w-md opacity-70">
            Your username appears on every card you post and join. No real name needed —
            just something people can recognise you by.
          </p>

          <div className="mt-10 space-y-6">
            <div>
              <label className="mono text-[10px] tracking-widest opacity-70">USERNAME</label>
              <div className="flex items-center mt-1 border border-ink">
                <span className="mono text-[14px] px-3 py-3 border-r border-ink bg-ink text-paper">@</span>
                <input
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="margaux, leon.paris, mira_lit"
                  className="mono text-[14px] flex-1 px-3 py-3 bg-white focus:outline-none"
                  maxLength={32}
                />
              </div>
              <p className="mono text-[10px] opacity-50 mt-1">
                3–32 chars · letters, numbers, . _ -
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
                  Square crop · 512 px · jpeg.
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

            {error && <p className="mono text-[11px] text-red-700">{error}</p>}

            <button
              onClick={submitStep1}
              disabled={!canSubmit1}
              className={`btn w-full ${!canSubmit1 ? "opacity-40" : ""}`}
            >
              {submitting ? "Saving…" : "Continue →"}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 px-6 py-10 max-w-xl w-full mx-auto">
          <div className="mono text-[10px] tracking-widest opacity-60">
            @{username.trim().toLowerCase()} · ONE MORE
          </div>
          <h1 className="editorial font-black text-[44px] sm:text-[64px] mt-3 leading-[0.92]">
            Where to find you.<br />What you're after.
          </h1>
          <p className="mono text-[12px] mt-4 max-w-md opacity-70">
            Both optional. Socials only show on your own card and your carnet.
            Interests help us surface what you'd want company for.
          </p>

          <div className="mt-10 space-y-6">
            <div className="space-y-3">
              <label className="mono text-[10px] tracking-widest opacity-70">SOCIALS</label>
              <SocialField prefix="@" label="INSTAGRAM" value={instagram} onChange={setInstagram} />
              <SocialField prefix="@" label="TELEGRAM" value={telegram} onChange={setTelegram} />
              <SocialField prefix="+" label="WHATSAPP" value={whatsapp} onChange={setWhatsapp} placeholder="33 6 12 34 56 78" />
              <SocialField prefix="↗" label="WEBSITE" value={site} onChange={setSite} placeholder="https://your.site" />
            </div>

            <div>
              <label className="mono text-[10px] tracking-widest opacity-70">INTERESTS</label>
              <p className="mono text-[10px] opacity-50 mt-1">
                Free-form tags — what would you want company for?
              </p>
              <TagInput
                value={interests}
                onChange={setInterests}
                max={10}
                suggestions={INTEREST_SUGGESTIONS}
                placeholder="e.g. fashion, film, walks"
                className="mt-2"
              />
            </div>

            {error && <p className="mono text-[11px] text-red-700">{error}</p>}

            <div className="flex items-center gap-2">
              <button
                onClick={() => submitStep2(true)}
                disabled={submitting}
                className="btn ghost flex-1"
              >
                Skip
              </button>
              <button
                onClick={() => submitStep2(false)}
                disabled={submitting}
                className="btn flex-1"
              >
                {submitting ? "Saving…" : "Enter Paris →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SocialField({
  prefix,
  label,
  value,
  onChange,
  placeholder,
}: {
  prefix: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center border border-ink">
      <span className="mono text-[11px] tracking-widest px-3 py-2.5 border-r border-ink bg-ink text-paper w-28">
        {prefix} {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "handle"}
        className="mono text-[13px] flex-1 px-3 py-2.5 bg-white focus:outline-none"
        maxLength={120}
      />
    </div>
  );
}
