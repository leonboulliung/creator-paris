"use client";

import { useState } from "react";
import { SignUpButton, useUser } from "@clerk/nextjs";

/**
 * One-tap resonance Signal on an idea. INTENT, not a vanity like:
 * "I'd want this to exist / I'd help make it real."
 *
 * Logged-out: signing in happens at the moment of signalling (join =
 * onboarding for ideas too). Logged-in: optimistic toggle, then revalidate.
 */
export function SignalButton({
  cardId,
  signalled,
  onChanged,
  full = false,
  size = "md",
}: {
  cardId: string;
  /** Whether the current user has already signalled. */
  signalled: boolean;
  /** Called after a successful toggle so the parent can re-fetch. */
  onChanged?: () => void;
  /** Stretch to fill its container (detail page). */
  full?: boolean;
  size?: "sm" | "md";
}) {
  const { user } = useUser();
  const [busy, setBusy] = useState(false);
  // Optimistic local state layered over the prop.
  const [local, setLocal] = useState<boolean | null>(null);
  const isOn = local ?? signalled;

  async function toggle() {
    if (busy) return;
    const next = !isOn;
    setLocal(next);
    setBusy(true);
    try {
      await fetch(`/api/cards/${cardId}/signal`, {
        method: next ? "POST" : "DELETE",
      });
      onChanged?.();
    } catch {
      setLocal(!next); // revert on failure
    } finally {
      setBusy(false);
    }
  }

  const pad = size === "sm" ? "px-3 py-2 text-[11px]" : "";

  if (!user) {
    return (
      <SignUpButton mode="modal" forceRedirectUrl={`/onboarding?next=/post/${cardId}`}>
        <button
          className={`cp-signal-btn ${pad} ${full ? "w-full justify-center" : ""}`}
          aria-label="Sign up to signal resonance"
        >
          <span className="cp-idea-mark" /> SIGNAL · I&apos;D WANT THIS
        </button>
      </SignUpButton>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`cp-signal-btn ${pad} ${isOn ? "on" : ""} ${full ? "w-full justify-center" : ""}`}
      aria-pressed={isOn}
    >
      {isOn ? (
        <>
          <span className="animate-signalPop">●</span> RESONATING ✓
        </>
      ) : (
        <>
          <span className="cp-idea-mark" /> SIGNAL · I&apos;D WANT THIS
        </>
      )}
    </button>
  );
}
