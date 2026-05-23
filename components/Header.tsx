"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { parisHour, parisNow, formatParisClock } from "@/lib/time";
import { TOD_LABEL, timeOfDayFromHour } from "@/lib/vibe";
import { Ticker } from "./Ticker";

export function Header({
  view,
  onViewChange,
}: {
  view?: "feed" | "map";
  onViewChange?: (v: "feed" | "map") => void;
}) {
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => setClock(formatParisClock(parisNow()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-paper border-b border-ink">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 gap-3">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="block w-2.5 h-2.5 bg-ink rounded-full group-hover:animate-pulseRing" />
          <span className="font-black tracking-tightest text-[17px] sm:text-[19px] leading-none">
            CREATOR<span className="opacity-60">.</span>PARIS
          </span>
        </Link>

        <div className="mono text-[11px] sm:text-[12px] flex items-center gap-2">
          <span className="hidden sm:inline opacity-60">PARIS</span>
          <span className="tabular-nums">{clock || "--:--:--"}</span>
          <span className="opacity-40">·</span>
          <span className="opacity-80">{TOD_LABEL[timeOfDayFromHour(parisHour())]}</span>
        </div>

        <div className="flex items-center gap-2">
          {view && onViewChange && (
            <div className="flex border border-ink mono text-[10px] tracking-widest">
              <button
                onClick={() => onViewChange("feed")}
                className={`px-3 py-1.5 ${view === "feed" ? "bg-ink text-paper" : "bg-paper text-ink"}`}
              >
                FEED
              </button>
              <button
                onClick={() => onViewChange("map")}
                className={`px-3 py-1.5 border-l border-ink ${view === "map" ? "bg-ink text-paper" : "bg-paper text-ink"}`}
              >
                MAP
              </button>
            </div>
          )}
          <SignedIn>
            <Link
              href="/carnet"
              className="ml-1 mono text-[10px] tracking-widest px-3 py-1.5 border border-ink hover:bg-ink hover:text-paper"
            >
              CARNET
            </Link>
            <div className="ml-1 [&_.cl-userButtonAvatarBox]:!w-9 [&_.cl-userButtonAvatarBox]:!h-9 [&_.cl-userButtonAvatarBox]:!rounded-none [&_.cl-userButtonAvatarBox]:!border [&_.cl-userButtonAvatarBox]:!border-ink">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="ml-1 mono text-[10px] tracking-widest px-3 py-1.5 border border-ink hover:bg-ink hover:text-paper">
                SIGN IN
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>

      <Ticker />
    </header>
  );
}
