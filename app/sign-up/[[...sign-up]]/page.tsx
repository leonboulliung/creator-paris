import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="border-b border-ink px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="cp-pulse-dot" />
          <span className="font-black tracking-tightest text-[17px] leading-none">
            CREATOR<span className="opacity-60">.</span>PARIS
          </span>
        </Link>
        <Link href="/" className="mono text-[11px] tracking-widest hover:underline">
          ← BACK
        </Link>
      </div>
      <div className="flex-1 grid place-items-center px-6 py-10">
        <div>
          <div className="mono text-[10px] tracking-widest opacity-60 mb-3 text-center">
            JOIN PARIS · ONE EMAIL, ONE PRESENCE
          </div>
          <SignUp />
        </div>
      </div>
    </div>
  );
}
