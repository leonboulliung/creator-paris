"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchActiveCards } from "@/lib/db";
import { useRealtimeCards } from "@/lib/realtime";
import type { Card } from "@/lib/types";
import { expiresIn, timeAgo } from "@/lib/time";

export function Ticker() {
  const [cards, setCards] = useState<Card[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    fetchActiveCards()
      .then(setCards)
      .catch(() => {});
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(() => setTick((t) => t + 1), 15_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useRealtimeCards(refresh);

  const items =
    cards.length === 0
      ? [
          "WELCOME TO CREATOR.PARIS",
          "ONE THING, THIS WEEK",
          "PARIS IS A LIVING CITY LAYER",
          "POST YOUR FIRST CARD →",
        ]
      : cards.slice(0, 24).map(
          (c) =>
            `${c.title.toUpperCase()}  ·  ${c.location.label.toUpperCase()}  ·  ${timeAgo(c.createdAt)}  ·  ${expiresIn(c.expiresAt).toUpperCase()}`,
        );

  const stream = [...items, ...items];

  return (
    <div className="relative w-full overflow-hidden border-y border-ink bg-ink text-paper" aria-hidden>
      <div
        className="flex whitespace-nowrap animate-ticker mono text-[11px] tracking-widest py-1.5"
        style={{ width: "200%" }}
        key={tick}
      >
        {stream.map((s, i) => (
          <span key={i} className="px-6">
            {s}
            <span className="opacity-50 px-2">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}
