"use client";

import { useState } from "react";
import { SignUpButton, useUser } from "@clerk/nextjs";

/**
 * Follow / unfollow another creator. Following surfaces their ideas + things
 * at the top of your field. Logged-out: sign-in happens at the tap. Logged-in:
 * optimistic toggle, then the parent re-fetches.
 */
export function FollowButton({
  targetId,
  following,
  onChanged,
}: {
  targetId: string;
  following: boolean;
  onChanged?: () => void;
}) {
  const { user } = useUser();
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState<boolean | null>(null);
  const isOn = local ?? following;

  // Never offer to follow yourself.
  if (user?.id === targetId) return null;

  const cls =
    "mono text-[10px] tracking-widest px-3 py-1.5 border border-ink transition";

  if (!user) {
    return (
      <SignUpButton mode="modal" forceRedirectUrl={`/u/${targetId}`}>
        <button className={`${cls} hover:bg-ink hover:text-paper`} aria-label="Sign up to follow">
          + FOLLOW
        </button>
      </SignUpButton>
    );
  }

  async function toggle() {
    if (busy) return;
    const next = !isOn;
    setLocal(next);
    setBusy(true);
    try {
      await fetch(`/api/follows/${targetId}`, { method: next ? "POST" : "DELETE" });
      onChanged?.();
    } catch {
      setLocal(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={isOn}
      className={`${cls} ${isOn ? "bg-ink text-paper" : "hover:bg-ink hover:text-paper"}`}
    >
      {isOn ? "FOLLOWING ✓" : "+ FOLLOW"}
    </button>
  );
}
