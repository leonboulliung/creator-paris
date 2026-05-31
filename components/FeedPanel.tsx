"use client";

import type { Card } from "@/lib/types";
import { CardItem } from "./CardItem";
import { IdeaItem } from "./IdeaItem";
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
 * Leads with IDEAS (cheap, alive) then THINGS (concrete, joinable). The cards
 * ARE the content; the panel keeps almost no chrome of its own — just the two
 * section labels, each carrying the collapse control on its right so it's
 * always reachable as you scroll.
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
  const isDesktop = useIsDesktop();
  const total = ideas.length + things.length;
  const collapseLabel = isDesktop ? "HIDE ›" : "MAP ↓";

  const sectionLabel = (text: string) => (
    <div className="sticky top-0 z-10 bg-paper/95 backdrop-blur-sm border-b border-ink px-4 py-2.5 flex items-center justify-between gap-2">
      <span className="mono text-[10px] tracking-widest font-bold">{text}</span>
      <button
        onClick={() => onExpandedChange(false)}
        className="shrink-0 mono text-[10px] tracking-widest px-2 py-1 border border-ink hover:bg-ink hover:text-paper transition"
        aria-label="Collapse field"
      >
        {collapseLabel}
      </button>
    </div>
  );

  const emptyField = (
    <div className="flex-1 overflow-y-auto bg-paper">
      {/* Even empty, keep the collapse reachable. */}
      <div className="sticky top-0 z-10 bg-paper/95 backdrop-blur-sm border-b border-ink px-4 py-2.5 flex items-center justify-end">
        <button
          onClick={() => onExpandedChange(false)}
          className="mono text-[10px] tracking-widest px-2 py-1 border border-ink hover:bg-ink hover:text-paper transition"
          aria-label="Collapse field"
        >
          {collapseLabel}
        </button>
      </div>
      <div className="px-4 py-12 text-center cp-idea-frame">
        <div className="editorial font-black text-[26px] leading-[0.95]">
          The field is open.
        </div>
        <p className="mono text-[11px] opacity-70 mt-2 leading-relaxed">
          Throw in an idea — a &ldquo;wouldn&rsquo;t it be great if we&hellip;&rdquo;.
          It costs nothing. Others resonate; when enough do, you make it real.
        </p>
        {onCompose && (
          <button onClick={() => onCompose("idea")} className="cp-signal-btn mt-5 mx-auto">
            <span className="cp-idea-mark" /> THROW THE FIRST IDEA
          </button>
        )}
      </div>
    </div>
  );

  const listBody = (
    <div className="flex-1 overflow-y-auto bg-paper">
      {/* IDEAS — lead with the intellectual life of the city. */}
      {ideas.length > 0 && (
        <>
          {sectionLabel("IDEAS")}
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

      {/* THINGS — concrete, joinable. */}
      {things.length > 0 && (
        <>
          {sectionLabel("THINGS")}
          {things.map((c, i) => (
            <CardItem key={c.id} card={c} index={i} isFresh={freshIds?.has(c.id)} />
          ))}
        </>
      )}

      {/* Bottom clearance so the last card clears the FAB. No platform text. */}
      <div style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }} />
    </div>
  );

  const body = loaded && total === 0 ? emptyField : listBody;

  if (isDesktop) {
    return (
      <aside
        className={`absolute top-0 right-0 bottom-0 z-[600] flex flex-col bg-paper border-l border-ink shadow-[0_0_40px_rgba(0,0,0,0.08)] transition-[width] duration-300 ease-out overflow-hidden ${
          expanded ? "w-[380px]" : "w-[52px]"
        }`}
        aria-label="The field"
      >
        {expanded ? (
          body
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
              THE FIELD{total > 0 ? ` · ${total}` : ""}
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
            {body}
          </>
        ) : (
          <button
            onClick={() => onExpandedChange(true)}
            className="w-full h-full px-4 flex items-center justify-between gap-2 relative"
            aria-label="Open the field"
          >
            <div className="absolute left-1/2 top-1.5 -translate-x-1/2 h-1 w-10 bg-ink/30 rounded-full" />
            <span className="mono text-[10px] tracking-widest">THE FIELD</span>
            <span className="mono text-[10px] tracking-widest">
              {total > 0 ? `${total} ↑` : "↑"}
            </span>
          </button>
        )}
      </div>
    </>
  );
}
