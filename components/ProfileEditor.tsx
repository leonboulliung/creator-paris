"use client";

import { useState } from "react";
import type { Profile } from "@/lib/types";
import { TagInput } from "./TagInput";

const INTEREST_SUGGESTIONS = [
  "film", "music", "art", "fashion", "food", "walks",
  "photography", "design", "books", "build", "sport", "talk",
];

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/i;
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

interface Props {
  profile: Profile;
  onClose: () => void;
  onSaved: () => void;
}

export function ProfileEditor({ profile, onClose, onSaved }: Props) {
  const [username, setUsername] = useState(profile.displayName);
  const [instagram, setInstagram] = useState(profile.socials?.instagram || "");
  const [telegram, setTelegram] = useState(profile.socials?.telegram || "");
  const [whatsapp, setWhatsapp] = useState(profile.socials?.whatsapp || "");
  const [site, setSite] = useState(profile.socials?.site || "");
  const [interests, setInterests] = useState<string[]>(
    profile.interests ?? [],
  );
  const [bio, setBio] = useState<string>(profile.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Username cooldown: only relevant when the user actually wants to change it.
  const nextChangeAt = profile.usernameChangedAt
    ? profile.usernameChangedAt + COOLDOWN_MS
    : 0;
  const cooldownActive = nextChangeAt > Date.now();
  const usernameChanged =
    username.trim().toLowerCase() !== profile.displayName.toLowerCase();
  const cooldownBlocking = cooldownActive && usernameChanged;

  function formatNext(ts: number) {
    return new Date(ts).toLocaleString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function save() {
    const handle = username.trim().toLowerCase();
    if (!USERNAME_RE.test(handle)) {
      setError("Username must be 3–32 chars · letters, numbers, . _ - only.");
      return;
    }
    if (cooldownBlocking) {
      setError(
        `Username can only change once per week. Next allowed: ${formatNext(nextChangeAt)}.`,
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: handle,
          socials: {
            instagram: instagram.trim(),
            telegram: telegram.trim(),
            whatsapp: whatsapp.trim(),
            site: site.trim(),
          },
          interests,
          bio: bio.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.error === "username_taken") {
          setError("That username is already taken. Try another.");
        } else if (json?.error === "username_cooldown" && json?.nextChangeAt) {
          setError(
            `Username can only change once per week. Next allowed: ${formatNext(
              new Date(json.nextChangeAt).getTime(),
            )}.`,
          );
        } else if (json?.error === "invalid_username") {
          setError("Username format invalid. Letters, numbers, . _ - only.");
        } else {
          setError((json?.error || "save failed").toString().toUpperCase());
        }
        return;
      }
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex sm:items-center sm:justify-center sm:bg-ink/60 sm:p-6">
      <div className="bg-paper flex flex-col w-full h-full sm:max-w-[600px] sm:max-h-[90vh] sm:h-auto sm:rounded-2xl sm:border sm:border-rule sm:shadow-lg sm:overflow-hidden">
        <div className="flex items-center justify-between border-b border-rule-strong px-4 sm:px-6 py-3 sm:py-4 shrink-0 safe-top">
          <div className="mono text-[10px] tracking-widest opacity-70">EDIT · PROFILE</div>
          <button onClick={onClose} className="mono text-[11px] tracking-widest hover:underline">
            CLOSE ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
          <div>
            <label className="mono text-[10px] tracking-widest opacity-70">USERNAME</label>
            <div className="flex items-center mt-1 border border-rule-strong">
              <span className="mono text-[14px] px-3 py-3 border-r border-rule-strong bg-ink text-paper">@</span>
              <input
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="mono text-[14px] flex-1 px-3 py-3 bg-white focus:outline-none"
                maxLength={32}
              />
            </div>
            <p className="mono text-[10px] opacity-50 mt-1">
              3–32 chars · letters, numbers, . _ - · must be unique
            </p>
            {cooldownActive && (
              <p
                className={`mono text-[10px] mt-1 ${
                  cooldownBlocking ? "text-red-700" : "opacity-50"
                }`}
              >
                Username can change 1× per week. Next allowed:{" "}
                {formatNext(nextChangeAt)}.
              </p>
            )}
          </div>

          <div>
            <label className="mono text-[10px] tracking-widest opacity-70">BIO</label>
            <p className="mono text-[10px] opacity-50 mt-1">
              One or two lines about you — what you do, what you're into.
            </p>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              rows={2}
              placeholder="e.g. Berlin-born art director, moonlighting as a filmmaker."
              className="input mt-1 resize-none"
              maxLength={200}
            />
            <div className="mono text-[10px] opacity-50 mt-1 text-right tabular-nums">
              {bio.length}/200
            </div>
          </div>

          <div className="space-y-3">
            <label className="mono text-[10px] tracking-widest opacity-70">SOCIALS</label>
            <Field prefix="@" label="INSTAGRAM" value={instagram} onChange={setInstagram} />
            <Field prefix="@" label="TELEGRAM" value={telegram} onChange={setTelegram} />
            <Field prefix="+" label="WHATSAPP" value={whatsapp} onChange={setWhatsapp} placeholder="33 6 12 34 56 78" />
            <Field prefix="↗" label="WEBSITE" value={site} onChange={setSite} placeholder="https://your.site" />
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

          <p className="mono text-[10px] opacity-50 border-t border-rule pt-4">
            Want to change your avatar? Click your avatar in the top-right and pick
            „Manage account" — handled by Clerk.
          </p>
        </div>

        <div
          className="border-t border-rule-strong px-4 sm:px-6 py-3 flex justify-end gap-2 shrink-0"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
        >
          <button onClick={onClose} className="btn ghost" disabled={saving}>
            Cancel
          </button>
          <button onClick={save} className="btn" disabled={saving}>
            {saving ? "Saving…" : "Save →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
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
    <div className="flex items-center border border-rule-strong">
      <span className="mono text-[11px] tracking-widest px-3 py-2.5 border-r border-rule-strong bg-ink text-paper w-28">
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
