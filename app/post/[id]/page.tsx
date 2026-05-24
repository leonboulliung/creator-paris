"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SignUpButton, useUser } from "@clerk/nextjs";
import { Header } from "@/components/Header";
import { VibeBackground } from "@/components/VibeBackground";
import { ParisMap } from "@/components/ParisMap";
import { fetchCardById } from "@/lib/db";
import { useRealtimeCards } from "@/lib/realtime";
import type { Card } from "@/lib/types";
import { expiresIn, parisHourOf, timeAgo } from "@/lib/time";
import { ACTIVITY_LABEL, computeVibe } from "@/lib/vibe";
import { shareCard } from "@/lib/share";

export default function PostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [card, setCard] = useState<Card | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{
    title: string;
    description: string;
    spots: number;
    permission: "public" | "request";
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const { user } = useUser();

  const refresh = useCallback(() => {
    fetchCardById(id)
      .then((c) => {
        setCard(c);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useRealtimeCards(refresh);

  if (!loaded) return <div className="min-h-screen bg-paper" />;
  if (!card) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 grid place-items-center px-6">
          <div className="text-center">
            <div className="editorial font-black text-[40px]">Card not found.</div>
            <p className="mono text-[12px] mt-2 opacity-70">
              It may have been removed or never existed.
            </p>
            <Link href="/" className="btn mt-6 inline-block">← Back to Paris</Link>
          </div>
        </div>
      </div>
    );
  }

  const vibe = computeVibe({
    title: card.title,
    label: card.location.label,
    hour: parisHourOf(card.createdAt),
    category: card.category,
  });
  const mine = !!user && user.id === card.ownerId;
  const joined = !!user && card.joiners.some((j) => j.userId === user.id);
  const requested = !!user && card.requests.some((r) => r.userId === user.id);
  const full = card.joiners.length >= card.spots;

  async function onShare() {
    if (!card) return;
    setSharing(true);
    try {
      await shareCard(card, card.owner.avatarUrl || undefined);
    } finally {
      setSharing(false);
    }
  }

  async function doJoin() {
    if (!card) return;
    setBusy(true);
    try {
      await fetch(`/api/cards/${card.id}/join`, { method: "POST" });
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function doLeave() {
    if (!card) return;
    setBusy(true);
    try {
      await fetch(`/api/cards/${card.id}/join`, { method: "DELETE" });
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function doAccept(uid: string) {
    if (!card) return;
    await fetch(`/api/cards/${card.id}/requests/${uid}`, { method: "POST" });
    refresh();
  }

  async function doDecline(uid: string) {
    if (!card) return;
    await fetch(`/api/cards/${card.id}/requests/${uid}`, { method: "DELETE" });
    refresh();
  }

  async function doRemoveJoiner(uid: string) {
    if (!card) return;
    if (!confirm("Remove this joiner from the crew?")) return;
    await fetch(`/api/cards/${card.id}/joiners/${uid}`, { method: "DELETE" });
    refresh();
  }

  async function doSetRole(uid: string, role: string) {
    if (!card) return;
    await fetch(`/api/cards/${card.id}/joiners/${uid}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    refresh();
  }

  function startEdit() {
    if (!card) return;
    setDraft({
      title: card.title,
      description: card.description,
      spots: card.spots,
      permission: card.permission,
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!card || !draft) return;
    setBusy(true);
    try {
      await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      setEditing(false);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removeCard() {
    if (!card) return;
    if (!confirm("Delete this card?")) return;
    await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    router.push("/");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <VibeBackground
        title={card.title}
        label={card.location.label}
        hour={parisHourOf(card.createdAt)}
        category={card.category}
        className="h-[42vh] sm:h-[52vh] border-b border-ink"
      >
        <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-8">
          <div className="flex items-center gap-2 text-paper drop-shadow">
            <span className="mono text-[10px] tracking-widest bg-ink/85 px-1.5 py-0.5">
              {ACTIVITY_LABEL[vibe.activity]}
            </span>
            <span className="mono text-[10px] tracking-widest opacity-90">
              {card.location.label.toUpperCase()}
            </span>
          </div>
          <h1 className="editorial font-black text-paper text-[42px] sm:text-[88px] mt-3 max-w-[20ch] drop-shadow-md">
            {card.title}
          </h1>
        </div>
      </VibeBackground>

      <div className="px-4 sm:px-8 py-6 max-w-4xl w-full mx-auto space-y-6">
        <div className="flex items-center gap-3 mono text-[11px]">
          {card.owner.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.owner.avatarUrl} alt="" className="w-10 h-10 border border-ink object-cover" />
          ) : (
            <div className="w-10 h-10 border border-ink bg-ink/10" aria-hidden />
          )}
          <div>
            <div>{card.owner.displayName}</div>
            <div className="opacity-60">{timeAgo(card.createdAt)} ago</div>
          </div>
          <div className="ml-auto flex items-center gap-3 flex-wrap justify-end">
            <span className="tag">
              {card.permission === "public" ? "PUBLIC JOIN" : "REQUEST"}
            </span>
            <span className="tabular-nums">
              {card.joiners.length}/{card.spots} SPOTS
            </span>
            {card.expiresAt && (
              <span
                className={`tag ${card.expiresAt <= Date.now() ? "bg-ink text-paper" : ""}`}
              >
                {expiresIn(card.expiresAt).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {card.description && (
          <p className="text-[18px] leading-[1.5] whitespace-pre-wrap max-w-2xl">
            {card.description}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mono text-[11px]">
          <div className="border border-ink p-3">
            <div className="opacity-60">STARTS</div>
            <div className="mt-1 text-[14px]">
              {card.expiresAt
                ? new Date(card.expiresAt).toLocaleString("en-GB", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </div>
            <div className="opacity-50 mt-1 text-[10px]">
              {expiresIn(card.expiresAt).toUpperCase()}
            </div>
          </div>
          <div className="border border-ink p-3">
            <div className="opacity-60">WHERE</div>
            <div className="mt-1 text-[14px]">{card.location.label}</div>
            <div className="opacity-50 mt-1 text-[10px]">
              {card.location.lat.toFixed(4)}, {card.location.lng.toFixed(4)}
            </div>
          </div>
        </div>

        <div className="border border-ink h-64">
          <ParisMap cards={[card]} highlightId={card.id} />
        </div>

        {/* actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {!mine && user && (
            <>
              {!joined && !requested && !full && (
                <button onClick={doJoin} disabled={busy} className="btn">
                  {card.permission === "public" ? "JOIN →" : "REQUEST TO JOIN →"}
                </button>
              )}
              {(joined || requested) && (
                <button onClick={doLeave} disabled={busy} className="btn ghost">
                  {joined ? "LEAVE" : "CANCEL REQUEST"}
                </button>
              )}
              {joined && <span className="tag">YOU'RE IN ✓</span>}
              {requested && <span className="tag">REQUEST PENDING</span>}
              {full && !joined && !requested && <span className="tag">FULL</span>}
            </>
          )}
          {mine && (
            <>
              <button onClick={startEdit} className="btn ghost">EDIT</button>
              <button onClick={removeCard} className="btn ghost">DELETE</button>
            </>
          )}
          {!user && !mine && !full && (
            <SignUpButton
              mode="modal"
              forceRedirectUrl={`/onboarding?next=/post/${card.id}`}
            >
              <button className="btn">
                {card.permission === "public" ? "SIGN UP TO JOIN →" : "SIGN UP TO REQUEST →"}
              </button>
            </SignUpButton>
          )}
          <button onClick={onShare} className="btn ghost ml-auto" disabled={sharing}>
            {sharing ? "RENDERING…" : "↗ SHARE AS IMAGE"}
          </button>
        </div>

        {/* owner pending requests */}
        {mine && card.requests.length > 0 && (
          <div className="border border-ink">
            <div className="px-3 py-2 mono text-[10px] tracking-widest bg-ink text-paper">
              PENDING REQUESTS · {card.requests.length}
            </div>
            <ul>
              {card.requests.map((r) => (
                <li
                  key={r.userId}
                  className="flex items-center justify-between px-3 py-2 border-t border-rule"
                >
                  <div className="mono text-[12px]">{r.user.displayName}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => doAccept(r.userId)}
                      className="mono text-[10px] tracking-widest px-3 py-1 border border-ink hover:bg-ink hover:text-paper"
                    >
                      ACCEPT
                    </button>
                    <button
                      onClick={() => doDecline(r.userId)}
                      className="mono text-[10px] tracking-widest px-3 py-1 border border-ink hover:bg-ink hover:text-paper"
                    >
                      DECLINE
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* crew — creator + joiners with roles */}
        <div className="border border-ink">
          <div className="px-3 py-2 mono text-[10px] tracking-widest bg-ink text-paper flex justify-between">
            <span>CREW · {1 + card.joiners.length}</span>
            {mine && card.joiners.length > 0 && (
              <span className="opacity-70">TAP A ROLE TO NAME IT</span>
            )}
          </div>
          <ul>
            <li className="px-3 py-2 border-t border-rule flex items-center gap-3">
              <span className="tag shrink-0">CREATOR</span>
              <span className="mono text-[12px] truncate">{card.owner.displayName}</span>
            </li>
            {card.joiners.map((j) => (
              <li key={j.userId} className="px-3 py-2 border-t border-rule flex items-center gap-3">
                {mine ? (
                  <input
                    defaultValue={j.role}
                    placeholder="ROLE — e.g. DJ, COOK, GUEST"
                    maxLength={40}
                    onBlur={(ev) => {
                      const v = ev.currentTarget.value;
                      if (v !== j.role) doSetRole(j.userId, v);
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") (ev.currentTarget as HTMLInputElement).blur();
                    }}
                    className="mono text-[10px] tracking-widest uppercase px-2 py-1 border border-ink bg-paper w-[180px] focus:outline-none focus:bg-ink focus:text-paper"
                  />
                ) : (
                  <span className="tag shrink-0">{j.role.toUpperCase() || "JOINER"}</span>
                )}
                <span className="mono text-[12px] truncate flex-1">{j.user.displayName}</span>
                {mine && (
                  <button
                    onClick={() => doRemoveJoiner(j.userId)}
                    className="mono text-[10px] tracking-widest opacity-50 hover:opacity-100"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-6">
          <Link href="/" className="mono text-[11px] tracking-widest hover:underline">
            ← BACK TO PARIS
          </Link>
        </div>
      </div>

      {editing && draft && (
        <div className="fixed inset-0 z-40 bg-paper flex flex-col">
          <div className="flex items-center justify-between border-b border-ink px-4 sm:px-6 py-3">
            <div className="mono text-[10px] tracking-widest opacity-70">EDIT · ONE THING</div>
            <button onClick={() => setEditing(false)} className="mono text-[11px] tracking-widest hover:underline">
              CLOSE ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 max-w-2xl w-full mx-auto space-y-4">
            <div>
              <label className="mono text-[10px] tracking-widest opacity-70">TITLE</label>
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="mono text-[10px] tracking-widest opacity-70">DESCRIPTION</label>
              <textarea
                value={draft.description}
                rows={4}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="input mt-1 resize-none"
              />
            </div>
            <div>
              <label className="mono text-[10px] tracking-widest opacity-70">SPOTS</label>
              <input
                type="number"
                min={1}
                max={99}
                value={draft.spots}
                onChange={(e) => setDraft({ ...draft, spots: Number(e.target.value) })}
                className="input mt-1 tabular-nums"
              />
            </div>
            <div>
              <label className="mono text-[10px] tracking-widest opacity-70">PERMISSION</label>
              <div className="mt-1 flex">
                <button
                  onClick={() => setDraft({ ...draft, permission: "public" })}
                  className={`flex-1 px-3 py-2 border border-ink mono text-[10px] tracking-widest ${draft.permission === "public" ? "bg-ink text-paper" : "bg-paper"}`}
                >
                  PUBLIC JOIN
                </button>
                <button
                  onClick={() => setDraft({ ...draft, permission: "request" })}
                  className={`flex-1 px-3 py-2 border border-ink border-l-0 mono text-[10px] tracking-widest ${draft.permission === "request" ? "bg-ink text-paper" : "bg-paper"}`}
                >
                  REQUEST
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-ink px-4 sm:px-6 py-3 flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="btn ghost" disabled={busy}>Cancel</button>
            <button onClick={saveEdit} className="btn" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
