"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";
import { Header } from "@/components/Header";
import { ParisMap } from "@/components/ParisMap";
import { FeedPanel } from "@/components/FeedPanel";
import { CardComposer } from "@/components/CardComposer";
import { fetchField } from "@/lib/db";
import { useRealtimeCards } from "@/lib/realtime";
import type { Card } from "@/lib/types";
import { useIsDesktop } from "@/lib/hooks";

// Keep these in lockstep with FeedPanel's own widths/heights.
const PANEL_DESKTOP_EXPANDED = 380;
const PANEL_DESKTOP_COLLAPSED = 52;
const PANEL_MOBILE_PEEK = 52;

export default function HomePage() {
  const router = useRouter();
  // The composer can be opened pre-tilted to "idea" or "thing".
  const [composing, setComposing] = useState<null | "idea" | "thing">(null);
  const [ideas, setIdeas] = useState<Card[]>([]);
  const [things, setThings] = useState<Card[]>([]);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  // IDs we've already seen, to flag genuinely new arrivals (not first load).
  const seenIdsRef = useRef<Set<string> | null>(null);
  const isDesktop = useIsDesktop();
  // The field is the lead. Open it by default on every viewport so a visitor
  // lands in the intellectual life of the city, not a dead map.
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [panelInitialized, setPanelInitialized] = useState(false);

  useEffect(() => {
    if (panelInitialized) return;
    setPanelExpanded(true);
    setPanelInitialized(true);
  }, [panelInitialized]);

  const refresh = useCallback(() => {
    fetchField()
      .then(({ ideas: nextIdeas, things: nextThings }) => {
        const all = [...nextIdeas, ...nextThings];
        const prevSeen = seenIdsRef.current;
        const nextSeen = new Set(all.map((c) => c.id));
        // On the very first load nothing is "fresh" — only flag arrivals
        // that appear after we already have a snapshot.
        if (prevSeen) {
          const newFresh = all.filter((c) => !prevSeen.has(c.id)).map((c) => c.id);
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
        }
        seenIdsRef.current = nextSeen;
        setIdeas(nextIdeas);
        setThings(nextThings);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useRealtimeCards(refresh);

  // Pins for both kinds — things filled, ideas hollow. Ideas without a
  // location are simply not pinned (handled inside ParisMap).
  const mapCards = [...things, ...ideas];

  // Hide FAB while the mobile bottom-sheet is expanded — it would float on
  // top of the open list and visually fight with CLOSE / list scrolling.
  const fabHidden = !!composing || (!isDesktop && panelExpanded);

  const fabShiftX = isDesktop
    ? panelExpanded
      ? PANEL_DESKTOP_EXPANDED
      : PANEL_DESKTOP_COLLAPSED
    : 0;
  const fabBottomExtra = isDesktop ? 0 : PANEL_MOBILE_PEEK + 14;

  const fabStyle = {
    bottom: `calc(env(safe-area-inset-bottom, 0px) + ${20 + fabBottomExtra}px)`,
    transform: fabShiftX ? `translateX(-${fabShiftX}px)` : undefined,
  } as const;

  return (
    <>
      <div className="app-shell">
        <Header onLogoClick={() => setComposing(null)} />
        <main className="no-scroll relative animate-fadeIn">
          {composing ? (
            <CardComposer initialKind={composing} onClose={() => setComposing(null)} />
          ) : (
            <>
              <ParisMap
                cards={mapCards}
                freshIds={freshIds}
                onSelectCard={(id) => router.push(`/post/${id}`)}
                height="100%"
                gestureHandling={false}
              />
              <FeedPanel
                expanded={panelExpanded}
                onExpandedChange={setPanelExpanded}
                ideas={ideas}
                things={things}
                loaded={loaded}
                freshIds={freshIds}
                onChanged={refresh}
                onCompose={(kind) => setComposing(kind)}
              />
            </>
          )}
        </main>
      </div>

      {!fabHidden && (
        <>
          <SignedIn>
            <button
              onClick={() => setComposing("idea")}
              className="fixed right-4 sm:right-5 z-[1000] bg-ink text-paper w-14 h-14 sm:w-auto sm:h-auto sm:px-5 sm:py-3 mono text-[12px] tracking-widest shadow-2xl hover:scale-[1.02] transition-transform duration-300 ease-out border border-paper/10 flex items-center justify-center gap-2"
              style={fabStyle}
              aria-label="Create"
            >
              <span className="sm:hidden text-2xl leading-none">+</span>
              <span className="hidden sm:inline">＋ CREATE</span>
            </button>
          </SignedIn>

          <SignedOut>
            <SignUpButton mode="modal" forceRedirectUrl="/onboarding?next=/">
              <button
                className="fixed right-4 sm:right-5 z-[1000] bg-ink text-paper w-14 h-14 sm:w-auto sm:h-auto sm:px-5 sm:py-3 mono text-[12px] tracking-widest shadow-2xl hover:scale-[1.02] transition-transform duration-300 ease-out border border-paper/10 flex items-center justify-center gap-2"
                style={fabStyle}
                aria-label="Sign up to create"
              >
                <span className="sm:hidden text-2xl leading-none">+</span>
                <span className="hidden sm:inline">＋ CREATE</span>
              </button>
            </SignUpButton>
          </SignedOut>
        </>
      )}
    </>
  );
}
