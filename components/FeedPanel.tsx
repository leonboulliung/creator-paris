"use client";

import { useEffect, useState } from "react";
import type { Card } from "@/lib/types";
import { CardItem } from "./CardItem";
import { IdeaItem } from "./IdeaItem";
import { formatParisClock, parisNow, parisTimeOfDay } from "@/lib/time";
import { TOD_LABEL } from "@/lib/vibe";
import { useIsDesktop } from "@/lib/hooks";

interface Props {
  expanded: boolean;
  onExpandedChange: (v: boolean) => void;
  ideas: Card[];
  things: Card[];
  loaded: boolean;
  /** Card IDs that arrived in the last ~10s — get a "NEW ✦" treatment. */
  freshIds?: Set<string>;
  /** Re-fetch the field after a signal toggles. */
  onChanged?: () => void;
  /** Open the composer pre-tilted to a kind. */
  onCompose?: (kind: "idea" | "thing") => void;
}

/**
 * THE FIELD — the living surface of the city, docked over the Paris map.
 *
 * It leads with IDEAS (cheap, alive, intellectual life that fills the field
 * before there are real events) and then lists THINGS (concrete, joinable).
 * The map behind is a lens; this is the frame.
 *
 * Desktop — docked right: 380px expanded / 52px vertical tab.
 * Mobile  — docked bottom: 80dvh expanded / 52px peek strip.
 */
export function FeedPanel({
  expanded,
  onExpandedChange,
  ideas,
  things,
  loaded,
  freshIds,
  onChanged,
  onCompose,
}: Props) {
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
  const total = ideas.length + things.length;
  const countLabel = `${ideas.length} IDEAS · ${things.length} THINGS`;

  const expandedHeaderRow = (closeLabel: string) => (
    <div className="shrink-0 border-b border-ink px-3 sm:px-4 py-3 flex items-center gap-2 bg-paper">
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
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
          {ideas.length}◦ {things.length}●
        </span>
      </div>
      <button
        onClick={() => onExpandedChange(false)}
        className="shrink-0 mono text-[10px] tracking-widest px-2 py-1 border border-ink hover:bg-ink hover:text-paper transition"
        aria-label="Collapse field"
      >
        {closeLabel}
      </button>
    </div>
  );

  const sectionLabel = (text: string, hint?: string) => (
    <div className="sticky top-0 z-10 bg-paper/95 backdrop-blur-sm border-b border-ink px-4 py-2 flex items-center gap-2">
      <span className="mono text-[10px] tracking-widest font-bold">{text}</span>
      {hint && <span className="mono text-[9px] tracking-widest opacity-50">{hint}</span>}
    </div>
  );

  const emptyField = (
    <div className="px-4 py-12 border-b border-ink text-center cp-idea-frame">
      <div className="editorial font-black text-[26px] leading-[0.95]">
        The field is open.
      </div>
      <p className="mono text-[11px] opacity-70 mt-2 leading-relaxed">
        Throw in an idea — a &ldquo;wouldn&rsquo;t it be great if we&hellip;&rdquo;.
        It costs nothing. Others resonate; when enough do, you make it real.
      </p>
      {onCompose && (
        <button
          onClick={() => onCompose("idea")}
          className="cp-signal-btn mt-5 mx-auto"
        >
          <span className="cp-idea-mark" /> THROW THE FIRST IDEA
        </button>
      )}
    </div>
  );

  const listBody = (
    <div className="flex-1 overflow-y-auto bg-paper">
      {loaded && total === 0 ? (
        emptyField
      ) : (
        <>
          {/* IDEAS — lead with the intellectual life of the city. */}
          {ideas.length > 0 && (
            <>
              {sectionLabel("◦ IDEAS IN THE FIELD", "RESONATE TO MAKE REAL")}
              {ideas.map((c, i) => (
                <IdeaItem
                  key={c.id}
                  card={c}
                  index={i}
                  isFresh={freshIds?.has(c.id)}
                  onChanged={onChanged}
                />
              ))}
            </>
          )}

          {/* THINGS — concrete, joinable, happening. */}
          {things.length > 0 && (
            <>
              {sectionLabel("● THINGS HAPPENING", "JOIN A CREW")}
              {things.map((c, i) => (
                <CardItem
                  key={c.id}
                  card={c}
                  index={i}
                  isFresh={freshIds?.has(c.id)}
                />
              ))}
            </>
          )}

          <div
            className="px-4 py-8 text-center mono text-[10px] tracking-widest opacity-50"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}
          >
            END OF FIELD · {countLabel}
          </div>
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
        aria-label="The field"
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
            aria-label="Open the field"
          >
            <span className="mono text-[14px] leading-none">‹</span>
            <span
              className="mono text-[10px] tracking-widest whitespace-nowrap select-none"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              THE FIELD &nbsp;·&nbsp; {total} LIVE
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
        aria-label="The field"
      >
        {expanded ? (
          <>
            <div className="flex justify-center pt-2 pb-1 shrink-0">
              <div className="h-1 w-10 bg-ink/30 rounded-full" />
            </div>
            {expandedHeaderRow("MAP ↓")}
            {listBody}
          </>
        ) : (
          <button
            onClick={() => onExpandedChange(true)}
            className="w-full h-full px-3 sm:px-4 flex items-center gap-2 relative"
            aria-label="Open the field"
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
                {ideas.length}◦ {things.length}●
              </span>
            </div>
            <span className="shrink-0 mono text-[10px] tracking-widest">THE FIELD ↑</span>
          </button>
        )}
      </div>
    </>
  );
}
