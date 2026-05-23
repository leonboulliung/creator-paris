"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ParisMap } from "@/components/ParisMap";
import {
  bindCrossTab,
  ensureMigrated,
  getTrackRecord,
  getUser,
  subscribe,
  sweepExpired,
  updateAvatar,
} from "@/lib/storage";
import type { TrackEntry } from "@/lib/types";
import { expiresIn, parisHourOf, timeAgo } from "@/lib/time";
import { downloadCarnetPoster, exportCarnetPrintable, shareCard } from "@/lib/share";
import { ACTIVITY_LABEL, computeVibe } from "@/lib/vibe";

type Tab = "track" | "map" | "export";

async function downscale(file: File, max = 256): Promise<string> {
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
  return sq.toDataURL("image/jpeg", 0.85);
}

export default function CarnetPage() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("track");
  const [track, setTrack] = useState<TrackEntry[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensureMigrated();
    bindCrossTab();
    sweepExpired();
    const refresh = () => {
      const u = getUser();
      setTrack(u ? getTrackRecord(u.email) : []);
    };
    refresh();
    const unsub = subscribe(refresh);
    setReady(true);
    return () => unsub();
  }, []);

  const user = typeof window === "undefined" ? null : getUser();

  const mapCards = useMemo(() => track.map((t) => t.card), [track]);
  const counts = useMemo(() => {
    const created = track.filter((t) => t.isCreator).length;
    const joined = track.length - created;
    return { created, joined, total: track.length };
  }, [track]);

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await downscale(f, 256);
    updateAvatar(url);
  }

  if (!ready) return <div className="min-h-screen bg-paper" />;
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 grid place-items-center px-6 text-center">
          <div>
            <div className="editorial font-black text-[40px]">No carnet yet.</div>
            <Link href="/" className="btn mt-6 inline-block">← Go set up</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="border-b border-ink px-4 sm:px-8 py-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-16 h-16 sm:w-20 sm:h-20 border border-ink overflow-hidden bg-white"
            aria-label="Change picture"
          >
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : null}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
          <div className="flex-1 min-w-0">
            <div className="mono text-[10px] tracking-widest opacity-60">CARNET</div>
            <h1 className="editorial font-black text-[34px] sm:text-[56px] leading-none mt-1 truncate">
              {user.email}
            </h1>
            <div className="mono text-[11px] mt-2 opacity-70">
              {counts.total} ENTR{counts.total === 1 ? "Y" : "IES"} · {counts.created} CREATED · {counts.joined} JOINED
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-ink px-4 sm:px-8 flex">
        {(["track", "map", "export"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 mono text-[11px] tracking-widest border-r border-ink ${tab === t ? "bg-ink text-paper" : "bg-paper text-ink"}`}
          >
            {t === "track" ? "TRACK RECORD" : t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {tab === "track" && (
          <div>
            {track.map((t) => (
              <TrackRow key={`${t.card.id}-${t.isCreator ? "c" : "j"}`} entry={t} user={user} />
            ))}
            {track.length === 0 && (
              <div className="px-6 py-20 text-center">
                <div className="editorial font-black text-[34px]">Your track is empty.</div>
                <p className="mono text-[12px] opacity-70 mt-2">
                  Post a card — or join someone else's. Either way, it lands here.
                </p>
                <Link href="/" className="btn inline-block mt-6">＋ POST ONE THING</Link>
              </div>
            )}
          </div>
        )}

        {tab === "map" && (
          <div className="relative h-[calc(100vh-94px-150px-49px)] min-h-[480px]">
            <ParisMap cards={mapCards} />
            <div className="absolute bottom-3 left-3 z-[400] mono text-[10px] tracking-widest bg-paper border border-ink px-2 py-1">
              YOUR CONSTELLATION · {mapCards.length} PIN{mapCards.length === 1 ? "" : "S"}
            </div>
          </div>
        )}

        {tab === "export" && (
          <div className="px-4 sm:px-8 py-8 space-y-6 max-w-2xl">
            <div>
              <div className="editorial font-black text-[28px]">Carnet Poster</div>
              <p className="mono text-[11px] opacity-70 mt-2">
                High-res PNG of your Paris constellation — chronological trajectory through the city.
              </p>
              <button
                onClick={() =>
                  downloadCarnetPoster(
                    mapCards.map((c) => ({
                      lat: c.location.lat,
                      lng: c.location.lng,
                      label: c.location.label,
                      title: c.title,
                      createdAt: c.createdAt,
                    })),
                    user.email,
                  )
                }
                className="btn mt-3"
                disabled={mapCards.length === 0}
              >
                DOWNLOAD POSTER (1600×2000)
              </button>
            </div>

            <div className="border-t border-ink pt-6">
              <div className="editorial font-black text-[28px]">Carnet PDF</div>
              <p className="mono text-[11px] opacity-70 mt-2">
                All your cards stitched together · opens a print window — save as PDF.
              </p>
              <button
                onClick={() => exportCarnetPrintable(mapCards, user.email)}
                className="btn mt-3"
                disabled={mapCards.length === 0}
              >
                EXPORT AS PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackRow({
  entry,
  user,
}: {
  entry: TrackEntry;
  user: { email: string; avatar: string };
}) {
  const { card, role, at, isCreator } = entry;
  const vibe = computeVibe({
    title: card.title,
    label: card.location.label,
    hour: parisHourOf(card.createdAt),
  });
  const [busy, setBusy] = useState(false);
  const now = Date.now();
  const status = card.archived || card.expiresAt <= now ? "ARCHIVED" : "ACTIVE";

  return (
    <div className="border-b border-ink flex items-stretch">
      <Link href={`/post/${card.id}`} className="flex-1 flex items-stretch min-w-0">
        <div
          className="w-24 sm:w-40 shrink-0 noise relative"
          style={{ backgroundImage: vibe.cssBackground }}
        >
          {vibe.isNight && <div className="absolute inset-0 stars" />}
          <div className="absolute left-2 top-2 mono text-[9px] tracking-widest text-paper bg-ink/85 px-1.5 py-0.5">
            {ACTIVITY_LABEL[vibe.activity]}
          </div>
          <div className="absolute right-2 bottom-2 mono text-[9px] tracking-widest text-paper bg-ink/85 px-1.5 py-0.5">
            {status}
          </div>
        </div>
        <div className="flex-1 px-4 sm:px-6 py-4 sm:py-5 min-w-0">
          <div className="mono text-[10px] tracking-widest flex items-center gap-2 opacity-70">
            <span
              className={`px-1.5 py-0.5 border border-ink ${isCreator ? "bg-ink text-paper" : "bg-paper text-ink"}`}
            >
              {role}
            </span>
            <span>{card.location.label.toUpperCase()}</span>
            <span className="ml-auto">{timeAgo(at)}</span>
          </div>
          <h2 className="editorial font-black text-[24px] sm:text-[32px] mt-2 leading-[0.95]">
            {card.title}
          </h2>
          <div className="mt-3 mono text-[11px] opacity-70">
            {isCreator ? "BY YOU" : `BY ${card.ownerEmail}`} · {card.joiners.length}/{card.spots} SPOTS · {expiresIn(card.expiresAt).toUpperCase()}
          </div>
        </div>
      </Link>
      <button
        onClick={async () => {
          setBusy(true);
          try {
            await shareCard(card, user.avatar);
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="w-16 sm:w-24 border-l border-ink mono text-[10px] tracking-widest hover:bg-ink hover:text-paper"
        aria-label="Share as image"
      >
        {busy ? "…" : "↗ SHARE"}
      </button>
    </div>
  );
}
