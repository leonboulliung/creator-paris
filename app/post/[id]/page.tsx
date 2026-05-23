"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { VibeBackground } from "@/components/VibeBackground";
import { ParisMap } from "@/components/ParisMap";
import { EmailGate } from "@/components/EmailGate";
import {
  acceptRequest,
  bindCrossTab,
  deleteCard,
  declineRequest,
  ensureMigrated,
  getCardById,
  getUser,
  joinCard,
  removeJoiner,
  setJoinerRole,
  subscribe,
  sweepExpired,
  upsertCard,
} from "@/lib/storage";
import type { Card } from "@/lib/types";
import { expiresIn, parisHourOf, timeAgo } from "@/lib/time";
import { ACTIVITY_LABEL, computeVibe } from "@/lib/vibe";
import { shareCard } from "@/lib/share";

export default function PostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [card, setCard] = useState<Card | null>(null);
  const [ready, setReady] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Card | null>(null);
  const [gating, setGating] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    ensureMigrated();
    bindCrossTab();
    sweepExpired();
    const refresh = () => setCard(getCardById(id) || null);
    refresh();
    const u = subscribe(refresh);
    setReady(true);
    return () => u();
  }, [id]);

  const user = typeof window === "undefined" ? null : getUser();
  const mine = card && user && card.ownerEmail === user.email;
  const ownerAvatar = useMemo(() => (mine && user ? user.avatar : ""), [mine, user]);

  if (!ready) return <div className="min-h-screen bg-paper" />;
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
  });
  const joined = user ? card.joiners.includes(user.email) : false;
  const requested = user ? card.requests.some((r) => r.email === user.email) : false;
  const full = card.joiners.length >= card.spots;

  async function onShare() {
    if (!card) return;
    try {
      setSharing(true);
      // get the avatar of the owner — local storage only has the current user; if mine, use that
      const av =
        user && user.email === card.ownerEmail ? user.avatar : ownerAvatar || undefined;
      await shareCard(card, av);
    } finally {
      setSharing(false);
    }
  }

  function startEdit() {
    if (!card) return;
    setDraft({ ...card });
    setEditing(true);
  }

  function saveEdit() {
    if (!draft) return;
    upsertCard(draft);
    setEditing(false);
  }

  function removeCard() {
    if (!card) return;
    if (!confirm("Delete this card?")) return;
    deleteCard(card.id);
    router.push("/");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <VibeBackground
        title={card.title}
        label={card.location.label}
        hour={parisHourOf(card.createdAt)}
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
          {mine && user ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} className="w-10 h-10 border border-ink object-cover" alt="" />
          ) : (
            <div className="w-10 h-10 border border-ink bg-ink/10" aria-hidden />
          )}
          <div>
            <div>{card.ownerEmail}</div>
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
            <div className="opacity-60">EXPIRES</div>
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

        {/* mini map */}
        <div className="border border-ink h-64">
          <ParisMap cards={[card]} highlightId={card.id} />
        </div>

        {/* actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {!mine && user && (
            <>
              {!joined && !requested && !full && (
                <button
                  onClick={() => joinCard(card.id, user.email)}
                  className="btn"
                >
                  {card.permission === "public" ? "JOIN →" : "REQUEST TO JOIN →"}
                </button>
              )}
              {joined && <span className="tag">YOU'RE IN ✓</span>}
              {requested && <span className="tag">REQUEST PENDING</span>}
              {full && !joined && !requested && <span className="tag">FULL</span>}
            </>
          )}
          {!user && !mine && !full && (
            <button onClick={() => setGating(true)} className="btn">
              {card.permission === "public" ? "SIGN IN TO JOIN →" : "SIGN IN TO REQUEST →"}
            </button>
          )}
          {!user && full && <span className="tag">FULL</span>}
          {mine && (
            <>
              <button onClick={startEdit} className="btn ghost">EDIT</button>
              <button onClick={removeCard} className="btn ghost">DELETE</button>
            </>
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
                <li key={r.email} className="flex items-center justify-between px-3 py-2 border-t border-rule">
                  <div className="mono text-[12px]">{r.email}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptRequest(card.id, r.email)}
                      className="mono text-[10px] tracking-widest px-3 py-1 border border-ink hover:bg-ink hover:text-paper"
                    >
                      ACCEPT
                    </button>
                    <button
                      onClick={() => declineRequest(card.id, r.email)}
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
              <span className="mono text-[12px] truncate">{card.ownerEmail}</span>
            </li>
            {card.joiners.map((e) => {
              const role = card.roles?.[e]?.trim() || "";
              return (
                <li key={e} className="px-3 py-2 border-t border-rule flex items-center gap-3">
                  {mine ? (
                    <input
                      defaultValue={role}
                      placeholder="ROLE — e.g. DJ, COOK, GUEST"
                      maxLength={40}
                      onBlur={(ev) => {
                        const v = ev.currentTarget.value;
                        if (v !== role) setJoinerRole(card.id, e, v);
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") (ev.currentTarget as HTMLInputElement).blur();
                      }}
                      className="mono text-[10px] tracking-widest uppercase px-2 py-1 border border-ink bg-paper w-[180px] focus:outline-none focus:bg-ink focus:text-paper"
                    />
                  ) : (
                    <span className="tag shrink-0">{role.toUpperCase() || "JOINER"}</span>
                  )}
                  <span className="mono text-[12px] truncate flex-1">{e}</span>
                  {mine && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${e} from the crew?`)) removeJoiner(card.id, e);
                      }}
                      className="mono text-[10px] tracking-widest opacity-50 hover:opacity-100"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="pt-6">
          <Link href="/" className="mono text-[11px] tracking-widest hover:underline">
            ← BACK TO PARIS
          </Link>
        </div>
      </div>

      {gating && card && (
        <EmailGate
          reason={card.permission === "public" ? "To join this card" : "To request to join"}
          onCancel={() => setGating(false)}
          onDone={() => {
            const u = getUser();
            if (u && card) joinCard(card.id, u.email);
            setGating(false);
            force((n) => n + 1);
          }}
        />
      )}

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
            <button onClick={() => setEditing(false)} className="btn ghost">Cancel</button>
            <button onClick={saveEdit} className="btn">Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
