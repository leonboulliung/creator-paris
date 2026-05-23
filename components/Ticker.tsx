"use client";

import { useEffect, useState } from "react";
import { getActiveCards, subscribe } from "@/lib/storage";
import { expiresIn, timeAgo } from "@/lib/time";

export function Ticker() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsub = subscribe(() => setTick((t) => t + 1));
    const id = window.setInterval(() => setTick((t) => t + 1), 15_000);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, []);

  const cards = typeof window === "undefined" ? [] : getActiveCards();
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

  // duplicate items for seamless loop
  const stream = [...items, ...items];

  return (
    <div className="relative w-full overflow-hidden border-y border-ink bg-ink text-paper" aria-hidden>
      <div className="flex whitespace-nowrap animate-ticker mono text-[11px] tracking-widest py-1.5" style={{ width: "200%" }} key={tick}>
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
