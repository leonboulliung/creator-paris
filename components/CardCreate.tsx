"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  archiveActiveFor,
  getActiveCardByOwner,
  getUser,
  newId,
  upsertCard,
} from "@/lib/storage";
import { searchQuartiers, Quartier } from "@/lib/quartiers";
import { computeVibe } from "@/lib/vibe";
import type { Card, Permission } from "@/lib/types";
import { ParisMap } from "./ParisMap";

export function CardCreate({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const user = useMemo(() => (typeof window === "undefined" ? null : getUser()), []);
  const existing = useMemo(
    () => (typeof window === "undefined" || !user ? null : getActiveCardByOwner(user.email)),
    [user],
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [spots, setSpots] = useState(4);
  const [permission, setPermission] = useState<Permission>("public");
  const [durationDays, setDurationDays] = useState<1 | 3 | 7>(3);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Quartier | null>(null);
  const [latlng, setLatlng] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestions, setSuggestions] = useState<Quartier[]>([]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setSuggestions(searchQuartiers(query, 8));
  }, [query]);

  const vibePreview = useMemo(() => {
    return computeVibe({
      title: title || "What's your one thing this week?",
      label: picked?.name || query || "Paris",
    });
  }, [title, picked, query]);

  function pickQuartier(q: Quartier) {
    setPicked(q);
    setQuery(q.name);
    setLatlng({ lat: q.lat, lng: q.lng });
    setSuggestions([]);
  }

  function submit() {
    if (!user) return;
    if (!title.trim() || !latlng) return;
    if (existing) {
      if (!confirming) {
        setConfirming(true);
        return;
      }
      archiveActiveFor(user.email);
    }
    const id = newId();
    const now = Date.now();
    const card: Card = {
      id,
      ownerEmail: user.email,
      title: title.trim(),
      description: description.trim(),
      location: {
        lat: latlng.lat,
        lng: latlng.lng,
        label: picked?.name || query.trim() || "Paris",
      },
      spots: Math.max(1, Math.min(99, Math.floor(spots))),
      permission,
      joiners: [],
      requests: [],
      createdAt: now,
      expiresAt: now + durationDays * 24 * 60 * 60 * 1000,
      durationDays,
      archived: false,
    };
    upsertCard(card);
    onClose();
    router.push(`/post/${id}`);
  }

  const canSubmit = title.trim() && latlng;

  return (
    <div className="fixed inset-0 z-40 bg-paper flex flex-col">
      <div className="flex items-center justify-between border-b border-ink px-4 sm:px-6 py-3">
        <div className="mono text-[10px] tracking-widest opacity-70">NEW · ONE THING</div>
        <button onClick={onClose} className="mono text-[11px] tracking-widest hover:underline">
          CLOSE ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* vibe preview */}
        <div
          className="relative h-40 sm:h-56 noise"
          style={{ backgroundImage: vibePreview.cssBackground }}
        >
          {vibePreview.isNight && <div className="absolute inset-0 stars" />}
          <div className="absolute inset-0 flex items-end p-4 sm:p-6">
            <div>
              <div className="mono text-[10px] tracking-widest bg-ink text-paper px-1.5 py-0.5 inline-block">
                LIVE VIBE PREVIEW
              </div>
              <div className="editorial font-black text-paper text-[22px] sm:text-[30px] mt-2 max-w-[80%] drop-shadow-md">
                {title || "What's your one thing this week?"}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl">
          <div className="space-y-4">
            <div>
              <label className="mono text-[10px] tracking-widest opacity-70">TITLE</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="A film night about loneliness. Sunday, my place."
                className="input mt-1"
                maxLength={140}
              />
            </div>

            <div>
              <label className="mono text-[10px] tracking-widest opacity-70">DESCRIPTION</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="A few sentences. Who is this for. What kind of energy."
                className="input mt-1 resize-none"
                maxLength={500}
              />
            </div>

            <div>
              <label className="mono text-[10px] tracking-widest opacity-70">SPOTS</label>
              <input
                type="number"
                min={1}
                max={99}
                value={spots}
                onChange={(e) => setSpots(Number(e.target.value))}
                className="input mt-1 tabular-nums"
              />
            </div>

            <div>
              <label className="mono text-[10px] tracking-widest opacity-70">JOIN PERMISSION</label>
              <div className="mt-1 flex">
                <button
                  type="button"
                  onClick={() => setPermission("public")}
                  className={`flex-1 px-3 py-2 border border-ink mono text-[10px] tracking-widest ${permission === "public" ? "bg-ink text-paper" : "bg-paper"}`}
                >
                  PUBLIC JOIN
                </button>
                <button
                  type="button"
                  onClick={() => setPermission("request")}
                  className={`flex-1 px-3 py-2 border border-ink border-l-0 mono text-[10px] tracking-widest ${permission === "request" ? "bg-ink text-paper" : "bg-paper"}`}
                >
                  REQUEST TO JOIN
                </button>
              </div>
            </div>

            <div>
              <label className="mono text-[10px] tracking-widest opacity-70">
                LIVE FOR
              </label>
              <div className="mt-1 flex">
                {([1, 3, 7] as const).map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDurationDays(d)}
                    className={`flex-1 px-3 py-2 border border-ink mono text-[10px] tracking-widest ${i > 0 ? "border-l-0" : ""} ${durationDays === d ? "bg-ink text-paper" : "bg-paper"}`}
                  >
                    {d === 1 ? "24 HOURS" : `${d} DAYS`}
                  </button>
                ))}
              </div>
              <p className="mono text-[10px] mt-1 opacity-60">
                THEN AUTO-ARCHIVES INTO YOUR CARNET. EXPIRES {new Date(Date.now() + durationDays * 86_400_000).toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).toUpperCase()}
              </p>
            </div>

            <div>
              <label className="mono text-[10px] tracking-widest opacity-70">LOCATION</label>
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPicked(null);
                  }}
                  placeholder="Type a quartier — or drop a pin on the map →"
                  className="input mt-1"
                />
                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full bg-paper border border-ink border-t-0 z-20 max-h-56 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => pickQuartier(s)}
                        className="block w-full text-left px-3 py-2 hover:bg-ink hover:text-paper mono text-[12px] border-b border-rule last:border-b-0"
                      >
                        {s.name}
                        {s.arr && (
                          <span className="opacity-50 ml-2 text-[10px]">{s.arr}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {latlng && (
                <div className="mono text-[10px] mt-2 opacity-70">
                  PIN · {latlng.lat.toFixed(4)}, {latlng.lng.toFixed(4)}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="mono text-[10px] tracking-widest opacity-70">PIN ON MAP</label>
            <div className="border border-ink h-[460px] sm:h-[520px]">
              <ParisMap
                cards={[]}
                selectable
                pickedLatLng={latlng}
                onPick={(ll) => {
                  setLatlng(ll);
                  setPicked(null);
                  if (!query) setQuery("Custom pin");
                }}
              />
            </div>
            <p className="mono text-[10px] opacity-60">
              CLICK / TAP THE MAP TO DROP A PIN. DRAG TO ADJUST.
            </p>
          </div>
        </div>

        {existing && (
          <div className="px-4 sm:px-6 py-3 border-t border-ink mono text-[11px] bg-ink text-paper">
            HEADS UP — POSTING WILL ARCHIVE YOUR CURRENT CARD INTO YOUR CARNET.
          </div>
        )}
      </div>

      <div className="border-t border-ink px-4 sm:px-6 py-3 flex items-center justify-end gap-2">
        <button onClick={onClose} className="btn ghost">Cancel</button>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className={`btn ${!canSubmit ? "opacity-40" : ""}`}
        >
          {confirming && existing ? "Confirm — archive previous & post" : "Post →"}
        </button>
      </div>
    </div>
  );
}
