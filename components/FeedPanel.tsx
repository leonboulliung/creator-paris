"use client";

import { useEffect, useState } from "react";
import type { Card } from "@/lib/types";
import { CardItem } from "./CardItem";
import { formatParisClock, parisNow, parisTimeOfDay } from "@/lib/time";
import { TOD_LABEL } from "@/lib/vibe";
import { useIsDesktop } from "@/lib/hooks";

interface Props {
  expanded: boolean;
  onExpandedChange: (v: boolean) => void;
  cards: Card[];
  loaded: boolean;
  /** Card IDs that arrived in the last ~10s — get a "NEW ✦" treatment. */
  freshIds?: Set<string>;
}

/**
 * The feed list as a permanently docked object on the Paris map.
 *
 * Desktop — docked on the right edge:
 *   • Expanded: 380px panel with the full list.
 *   • Collapsed: 52px strip with vertical "n ACTIVE — OPEN LIST" tab.
 *
 * Mobile — docked at the bottom edge:
 *   • Expanded: 85dvh bottom-sheet with the full list.
 *   • Peek (collapsed): 52px strip showing clock · TOD · n ACTIVE + tap hint.
 *
 * Both viewports keep the panel always visible — it is part of the map UI,
 * not an overlay you have to summon. Expand and collapse, never hide.
 */
export function FeedPanel({ expanded, onExpandedChange, cards, loaded, freshIds }: Props) {
  const [clock, setClock] = useState("--:--");
  const isDesktop = useIsDesktop();

  useEffect(() => {
    const tick = () => {
      const d = parisNow();
      setClock(formatParisClock(d).slice(0, 5));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const tod = parisTimeOfDay();
  const countLabel = `${cards.length} ACTIVE`;

  // Shared row for expanded headers (desktop + mobile).
  // `min-w-0` on the meta block + `shrink-0` on the close button keep the row
  // from overflowing on narrow viewports (down to 320px iPhone-SE class).
  const expandedHeaderRow = (closeLabel: string) => (
    <div className="shrink-0 border-b border-ink px-3 sm:px-4 py-3 flex items-center gap-2 bg-paper">
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
        {/* Twinkling live-dot to signal a real-time stream */}
        <span
          className="shrink-0 inline-block w-1.5 h-1.5 rounded-full bg-[#c2452f] animate-twinkle"
          aria-hidden
        />
        <span className="mono text-[10px] tracking-widest tabular-nums shrink-0">
          {clock}
        </span>
        <span className="opacity-40 hidden min-[360px]:inline">·</span>
        <span className="mono text-[10px] tracking-widest truncate hidden min-[360px]:inline">
          {TOD_LABEL[tod]}
        </span>
        <span className="opacity-40">·</span>
        <span className="mono text-[10px] tracking-widest tabular-nums shrink-0">
          {countLabel}
        </span>
      </div>
      <button
        onClick={() => onExpandedChange(false)}
        className="shrink-0 mono text-[10px] tracking-widest px-2 py-1 border border-ink hover:bg-ink hover:text-paper transition"
        aria-label="Collapse list"
      >
        {closeLabel}
      </button>
    </div>
  );

  const listBody = (
    <div className="flex-1 overflow-y-auto bg-paper">
      {loaded && cards.length === 0 ? (
        <div className="px-4 py-14 border-b border-ink text-center">
          <div className="editorial font-black text-[28px] leading-[0.95]">
            The city is quiet.
          </div>
          <p className="mono text-[11px] opacity-70 mt-2">
            Be the first card. A walk, a film night, a pickup match — whatever
            you'd want company for this week.
          </p>
        </div>
      ) : (
        <>
          {cards.map((c, i) => (
            <CardItem
              key={c.id}
              card={c}
              index={i}
              isFresh={freshIds?.has(c.id)}
            />
          ))}
          {cards.length > 0 && (
            <div
              className="px-4 py-8 text-center mono text-[10px] tracking-widest opacity-50"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}
            >
              END OF FEED · {cards.length} CARD{cards.length > 1 ? "S" : ""}
            </div>
          )}
        </>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <aside
        className={`absolute top-0 right-0 bottom-0 z-[600] flex flex-col bg-paper border-l border-ink shadow-[0_0_40px_rgba(0,0,0,0.08)] transition-[width] duration-300 ease-out overflow-hidden ${
          expanded ? "w-[380px]" : "w-[52px]"
        }`}
        aria-label="Active cards"
      >
        {expanded ? (
          <>
            {expandedHeaderRow("HIDE ›")}
            {listBody}
          </>
        ) : (
          <button
            onClick={() => onExpandedChange(true)}
            className="w-full h-full flex flex-col items-center justify-between py-4 hover:bg-ink/[0.04] transition"
            aria-label="Expand list"
          >
            <span className="mono text-[14px] leading-none">‹</span>
            <span
              className="mono text-[10px] tracking-widest whitespace-nowrap select-none"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {countLabel} &nbsp;·&nbsp; OPEN LIST
            </span>
            <span className="mono text-[14px] leading-none">‹</span>
          </button>
        )}
      </aside>
    );
  }

  // Mobile — docked at the bottom edge.
  return (
    <>
      {expanded && (
        <div
          className="absolute inset-0 z-[590] bg-ink/10"
          onClick={() => onExpandedChange(false)}
          aria-hidden
        />
      )}
      <div
        className="absolute inset-x-0 bottom-0 z-[600] flex flex-col bg-paper border-t border-ink shadow-[0_-8px_30px_rgba(0,0,0,0.18)] transition-[height] duration-300 ease-out overflow-hidden"
        style={{ height: expanded ? "80dvh" : "52px", maxHeight: "calc(100dvh - 80px)" }}
        aria-label="Active cards"
      >
        {expanded ? (
          <>
            <div className="flex justify-center pt-2 pb-1 shrink-0">
              <div className="h-1 w-10 bg-ink/30 rounded-full" />
            </div>
            {expandedHeaderRow("CLOSE ↓")}
            {listBody}
          </>
        ) : (
          <button
            onClick={() => onExpandedChange(true)}
            className="w-full h-full px-3 sm:px-4 flex items-center gap-2 relative"
            aria-label="Expand list"
          >
            <div className="absolute left-1/2 top-1.5 -translate-x-1/2 h-1 w-10 bg-ink/30 rounded-full" />
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              <span className="mono text-[10px] tracking-widest tabular-nums shrink-0">
                {clock}
              </span>
              <span className="opacity-40 hidden min-[360px]:inline">·</span>
              <span className="mono text-[10px] tracking-widest truncate hidden min-[360px]:inline">
                {TOD_LABEL[tod]}
              </span>
              <span className="opacity-40">·</span>
              <span className="mono text-[10px] tracking-widest tabular-nums shrink-0">
                {countLabel}
              </span>
            </div>
            <span className="shrink-0 mono text-[10px] tracking-widest">OPEN ↑</span>
          </button>
        )}
      </div>
    </>
  );
}
