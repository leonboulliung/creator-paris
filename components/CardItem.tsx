"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import type { Card } from "@/lib/types";
import { expiresIn, parisHourOf, timeAgo } from "@/lib/time";
import { computeVibe, ACTIVITY_LABEL } from "@/lib/vibe";

export function CardItem({ card, index = 0 }: { card: Card; index?: number }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const vibe = computeVibe({
    title: card.title,
    label: card.location.label,
    hour: parisHourOf(card.createdAt),
    category: card.category,
  });
  const { user } = useUser();
  const mine = user?.id === card.ownerId;

  return (
    <Link
      href={`/post/${card.id}`}
      className="block border-b border-ink group focus:outline-none"
    >
      <div className="flex items-stretch gap-0">
        <div
          className="relative w-24 sm:w-40 shrink-0 noise"
          style={{ backgroundImage: vibe.cssBackground }}
          aria-hidden
        >
          {vibe.isNight && <div className="absolute inset-0 stars" />}
          <div className="absolute left-2 top-2 mono text-[9px] tracking-widest text-paper bg-ink/85 px-1.5 py-0.5">
            {ACTIVITY_LABEL[vibe.activity]}
          </div>
        </div>

        <div className="flex-1 px-4 sm:px-6 py-4 sm:py-5 min-w-0">
          <div className="mono text-[10px] tracking-widest flex items-center gap-2 opacity-70">
            <span className="tabular-nums">#{String(index + 1).padStart(3, "0")}</span>
            <span>·</span>
            <span>{card.location.label.toUpperCase()}</span>
            <span className="ml-auto">{timeAgo(card.createdAt)}</span>
          </div>

          <h2 className="editorial font-black text-[28px] sm:text-[40px] mt-2 leading-[0.92] group-hover:underline decoration-2 underline-offset-4">
            {card.title}
          </h2>

          <div className="mt-3 flex items-center justify-between mono text-[11px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="tag">
                {card.permission === "public" ? "PUBLIC JOIN" : "REQUEST"}
              </span>
              <span className="tabular-nums">
                {card.joiners.length}/{card.spots} SPOTS
              </span>
              {card.expiresAt && (
                <span className="tabular-nums opacity-70">
                  · {expiresIn(card.expiresAt).toUpperCase()}
                </span>
              )}
              {card.requests.length > 0 && mine && (
                <span className="tabular-nums opacity-70">
                  · {card.requests.length} REQUEST{card.requests.length > 1 ? "S" : ""}
                </span>
              )}
            </div>
            <div className="opacity-70 truncate max-w-[140px]">
              {card.owner.displayName}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
