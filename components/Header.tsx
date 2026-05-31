"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { parisNow, parisTimeOfDay, formatParisClock } from "@/lib/time";
import { TOD_LABEL } from "@/lib/vibe";

export function Header({
  onLogoClick,
}: {
  /** Optional intercept on the logo click. The Link still navigates to "/" —
   *  this lets the page reset any in-page UI state (e.g. close the composer)
   *  even when the user is already on "/". */
  onLogoClick?: () => void;
} = {}) {
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => setClock(formatParisClock(parisNow()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const todLabel = TOD_LABEL[parisTimeOfDay()];
  const shortClock = clock ? clock.slice(0, 5) : "--:--";

  // The toggle button: on profile-ish routes we send the user back to the
  // city layer; everywhere else we offer the profile.
  const pathname = usePathname() || "/";
  const onProfileSurface =
    pathname.startsWith("/carnet") || pathname.startsWith("/u/");
  const altDest = onProfileSurface ? "/" : "/carnet";
  const altLabel = onProfileSurface ? "PARIS" : "PROFILE";

  // Only the post detail page has its own back-flow; everywhere else we want
  // the mobile profile-switch row visible.
  const showMobileSwitchRow = !pathname.startsWith("/post/");

  return (
    <header className="shrink-0 z-50 bg-paper border-b border-ink safe-top">
      {/* Row 1 — logo · clock · auth */}
      <div className="flex items-center px-3 sm:px-6 py-2 sm:py-3 gap-2 sm:gap-4">
        <Link
          href="/"
          onClick={() => onLogoClick?.()}
          className="flex items-center gap-3 shrink-0 min-w-0"
        >
          <span
            className="cp-pulse-dot"
            style={{ "--pin-color": "#3a5a96" } as React.CSSProperties}
          />
          <span className="font-black tracking-tightest text-[14px] sm:text-[17px] md:text-[19px] leading-none truncate">
            CREATOR<span className="opacity-60">.</span>PARIS
          </span>
        </Link>

        <div className="mono text-[10px] sm:text-[12px] flex items-center gap-1 sm:gap-2 ml-auto min-w-0">
          <span className="tabular-nums whitespace-nowrap">
            <span className="sm:hidden">{shortClock}</span>
            <span className="hidden sm:inline">{clock || "--:--:--"}</span>
          </span>
          <span className="hidden sm:inline opacity-40">·</span>
          <span className="hidden sm:inline opacity-80 truncate">{todLabel}</span>
        </div>

        {/* Desktop: profile switch + avatar */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <SignedIn>
            <Link
              href={altDest}
              className="ml-1 mono text-[10px] tracking-widest px-3 py-1.5 border border-ink hover:bg-ink hover:text-paper"
            >
              {altLabel}
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

        {/* Mobile: PROFILE/PARIS switch + avatar + sign-in. Inline so we
            never lose a header row for a single nav button. */}
        <div className="flex sm:hidden items-center gap-2 shrink-0">
          <SignedIn>
            {showMobileSwitchRow && (
              <Link
                href={altDest}
                className="mono text-[10px] tracking-widest px-2.5 py-1.5 border border-ink hover:bg-ink hover:text-paper"
              >
                {altLabel}
              </Link>
            )}
            <div className="[&_.cl-userButtonAvatarBox]:!w-8 [&_.cl-userButtonAvatarBox]:!h-8 [&_.cl-userButtonAvatarBox]:!rounded-none [&_.cl-userButtonAvatarBox]:!border [&_.cl-userButtonAvatarBox]:!border-ink">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="mono text-[10px] tracking-widest px-2.5 py-1.5 border border-ink hover:bg-ink hover:text-paper">
                SIGN IN
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
