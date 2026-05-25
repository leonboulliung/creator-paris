"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";
import { Header } from "@/components/Header";
import { ParisMap } from "@/components/ParisMap";
import { FeedPanel } from "@/components/FeedPanel";
import { CardCreate } from "@/components/CardCreate";
import { fetchActiveCards } from "@/lib/db";
import { useRealtimeCards } from "@/lib/realtime";
import type { Card } from "@/lib/types";
import { useIsDesktop } from "@/lib/hooks";

// Keep these in lockstep with FeedPanel's own widths/heights.
const PANEL_DESKTOP_EXPANDED = 380;
const PANEL_DESKTOP_COLLAPSED = 52;
const PANEL_MOBILE_PEEK = 52;

export default function HomePage() {
  const router = useRouter();
  const [composing, setComposing] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const isDesktop = useIsDesktop();
  // Default: expanded on desktop (plenty of room), peek on mobile.
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [panelInitialized, setPanelInitialized] = useState(false);

  useEffect(() => {
    if (panelInitialized) return;
    setPanelExpanded(isDesktop);
    setPanelInitialized(true);
  }, [isDesktop, panelInitialized]);

  const refresh = useCallback(() => {
    fetchActiveCards()
      .then((next) => {
        setCards((prev) => {
          const prevIds = new Set(prev.map((c) => c.id));
          const isFirstLoad = prev.length === 0;
          const newFresh = next.filter((c) => !prevIds.has(c.id)).map((c) => c.id);
          if (!isFirstLoad && newFresh.length > 0) {
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

  // Hide FAB while the mobile bottom-sheet is expanded — it would float on
  // top of the open list and visually fight with CLOSE / list scrolling.
  const fabHidden = composing || (!isDesktop && panelExpanded);

  // FAB sits "off the panel": shifts left by panel width on desktop, lifts
  // above the peek strip on mobile so it always clears the docked list.
  const fabShiftX = isDesktop
    ? panelExpanded
      ? PANEL_DESKTOP_EXPANDED
      : PANEL_DESKTOP_COLLAPSED
    : 0;
  const fabBottomExtra = isDesktop ? 0 : PANEL_MOBILE_PEEK;

  return (
    <>
      <div className="app-shell">
        <Header />
        <main className="no-scroll relative">
          {composing ? (
            <CardCreate onClose={() => setComposing(false)} />
          ) : (
            <>
              <ParisMap
                cards={cards}
                freshIds={freshIds}
                onSelectCard={(id) => router.push(`/post/${id}`)}
                height="100%"
                gestureHandling={false}
              />
              <FeedPanel
                expanded={panelExpanded}
                onExpandedChange={setPanelExpanded}
                cards={cards}
                loaded={loaded}
              />
            </>
          )}
        </main>
      </div>

      {!fabHidden && (
        <>
          <SignedIn>
            <button
              onClick={() => setComposing(true)}
              className="fixed right-4 sm:right-5 z-[1000] bg-ink text-paper w-14 h-14 sm:w-auto sm:h-auto sm:px-5 sm:py-3 mono text-[12px] tracking-widest shadow-2xl hover:scale-[1.02] transition-transform duration-300 ease-out border border-paper/10"
              style={{
                bottom: `calc(env(safe-area-inset-bottom, 0px) + ${20 + fabBottomExtra}px)`,
                transform: fabShiftX ? `translateX(-${fabShiftX}px)` : undefined,
              }}
              aria-label="Post one thing"
            >
              <span className="sm:hidden text-2xl leading-none">+</span>
              <span className="hidden sm:inline">＋ ONE THING</span>
            </button>
          </SignedIn>

          <SignedOut>
            <SignUpButton mode="modal" forceRedirectUrl="/onboarding?next=/">
              <button
                className="fixed right-4 sm:right-5 z-[1000] bg-ink text-paper w-14 h-14 sm:w-auto sm:h-auto sm:px-5 sm:py-3 mono text-[12px] tracking-widest shadow-2xl hover:scale-[1.02] transition-transform duration-300 ease-out border border-paper/10"
                style={{
                  bottom: `calc(env(safe-area-inset-bottom, 0px) + ${20 + fabBottomExtra}px)`,
                  transform: fabShiftX ? `translateX(-${fabShiftX}px)` : undefined,
                }}
                aria-label="Sign up to post"
              >
                <span className="sm:hidden text-2xl leading-none">+</span>
                <span className="hidden sm:inline">＋ ONE THING</span>
              </button>
            </SignUpButton>
          </SignedOut>
        </>
      )}
    </>
  );
}
