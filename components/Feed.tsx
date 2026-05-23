"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getActiveCards, subscribe } from "@/lib/storage";
import type { Card } from "@/lib/types";
import { CardItem } from "./CardItem";
import { ParisMap } from "./ParisMap";
import { formatParisClock, parisHour, parisNow } from "@/lib/time";
import { TOD_LABEL, timeOfDayFromHour } from "@/lib/vibe";

export function Feed({ view }: { view: "feed" | "map" }) {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [clock, setClock] = useState("--:--");

  useEffect(() => {
    const tick = () => {
      const d = parisNow();
      setClock(formatParisClock(d).slice(0, 5));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const tod = timeOfDayFromHour(parisHour());

  useEffect(() => {
    const refresh = () => {
      const next = getActiveCards();
      setCards((prev) => {
        const prevIds = new Set(prev.map((c) => c.id));
        const newFresh = next.filter((c) => !prevIds.has(c.id)).map((c) => c.id);
        if (newFresh.length > 0) {
          setFreshIds((f) => {
            const nx = new Set(f);
            newFresh.forEach((id) => nx.add(id));
            return nx;
          });
          newFresh.forEach((id) => {
            window.setTimeout(() => {
              setFreshIds((f) => {
                const nx = new Set(f);
                nx.delete(id);
                return nx;
              });
            }, 10_000);
          });
        }
        return next;
      });
    };
    refresh();
    const u = subscribe(refresh);
    return () => u();
  }, []);

  if (view === "map") {
    return (
      <div className="relative h-[calc(100vh-94px)]">
        <ParisMap
          cards={cards}
          freshIds={freshIds}
          onSelectCard={(id) => router.push(`/post/${id}`)}
          height="100%"
        />
        <div className="absolute bottom-3 left-3 z-[400] mono text-[10px] tracking-widest bg-paper border border-ink px-2 py-1 flex items-center gap-2">
          <span className="tabular-nums">{clock}</span>
          <span>·</span>
          <span>{TOD_LABEL[tod]}</span>
          <span>·</span>
          <span>{cards.length} ACTIVE</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper">
      {cards.length === 0 && (
        <div className="px-4 sm:px-6 py-14 border-b border-ink text-center">
          <div className="editorial font-black text-[34px] sm:text-[44px]">
            The city is quiet.
          </div>
          <p className="mono text-[12px] opacity-70 mt-2 max-w-md mx-auto">
            Be the first card. A walk, a film night, a pickup match, a curation —
            whatever you'd want company for this week.
          </p>
        </div>
      )}
      {cards.map((c, i) => (
        <CardItem key={c.id} card={c} index={i} />
      ))}
      {cards.length > 0 && (
        <div className="px-4 sm:px-6 py-8 text-center mono text-[10px] tracking-widest opacity-50">
          END OF FEED · {cards.length} CARD{cards.length > 1 ? "S" : ""}
        </div>
      )}
    </div>
  );
}
