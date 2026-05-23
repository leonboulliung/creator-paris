"use client";

import { useEffect, useState } from "react";
import { bindCrossTab, ensureMigrated, getUser, sweepExpired } from "@/lib/storage";
import { EmailGate } from "@/components/EmailGate";
import { Header } from "@/components/Header";
import { Feed } from "@/components/Feed";
import { CardCreate } from "@/components/CardCreate";

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [hasUser, setHasUser] = useState(false);
  const [view, setView] = useState<"feed" | "map">("feed");
  const [composing, setComposing] = useState(false);
  const [gating, setGating] = useState(false);

  useEffect(() => {
    ensureMigrated();
    bindCrossTab();
    sweepExpired();
    setHasUser(!!getUser());
    setReady(true);
    const id = window.setInterval(() => sweepExpired(), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!ready) return <div className="min-h-screen bg-paper" />;

  function tryCompose() {
    if (hasUser) setComposing(true);
    else setGating(true);
  }

  return (
    <>
      <div className="min-h-screen flex flex-col">
        <Header view={view} onViewChange={setView} />
        <main className="flex-1">
          <Feed view={view} />
        </main>
      </div>

      <button
        onClick={tryCompose}
        className="fixed bottom-5 right-5 z-30 bg-ink text-paper w-14 h-14 sm:w-auto sm:h-auto sm:px-5 sm:py-3 mono text-[12px] tracking-widest shadow-xl hover:scale-[1.02] transition"
        aria-label="Post one thing"
      >
        <span className="sm:hidden text-2xl leading-none">+</span>
        <span className="hidden sm:inline">＋ ONE THING</span>
      </button>

      {gating && (
        <EmailGate
          reason="To post your one thing"
          onCancel={() => setGating(false)}
          onDone={() => {
            setHasUser(true);
            setGating(false);
            setComposing(true);
          }}
        />
      )}

      {composing && <CardCreate onClose={() => setComposing(false)} />}
    </>
  );
}
