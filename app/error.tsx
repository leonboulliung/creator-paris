"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[creator.paris] Render error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <div className="border-b border-rule-strong px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="block w-2.5 h-2.5 bg-ink rounded-full" />
          <span className="font-black tracking-tightest text-[17px] leading-none">
            CREATOR<span className="opacity-60">.</span>PARIS
          </span>
        </Link>
        <div className="mono text-[11px] tracking-widest opacity-60">ERROR</div>
      </div>
      <div className="flex-1 px-6 py-12 max-w-2xl mx-auto w-full">
        <div className="mono text-[10px] tracking-widest opacity-60">CITY LAYER · UNCAUGHT EXCEPTION</div>
        <h1 className="editorial font-black text-[48px] sm:text-[64px] mt-3 leading-[0.95]">
          The city stumbled.
        </h1>
        <p className="mono text-[12px] mt-6 opacity-80">
          Something threw during render. The page can be retried — if it keeps
          happening, the reference below helps us track it down.
        </p>
        {error.digest && (
          <div className="mono text-[11px] mt-6 p-4 border border-rule-strong bg-white">
            REFERENCE · {error.digest}
          </div>
        )}
        <div className="flex gap-2 mt-6">
          <button onClick={reset} className="btn">Try again</button>
          <Link href="/" className="btn ghost">Back to /</Link>
        </div>
      </div>
    </div>
  );
}
