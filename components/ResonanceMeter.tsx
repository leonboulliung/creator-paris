"use client";

/**
 * Resonance meter — renders accumulated signals on an idea as a row of dots.
 * Filled dots are people who want it real; the last lit dot reads warm to
 * give the meter a "live" edge. A latent idea (0 signals) shows open dots:
 * open potential waiting to be filled.
 */
export function ResonanceMeter({
  count,
  capacity = 7,
  className = "",
}: {
  count: number;
  /** How many dots to draw. The meter caps visually but the number is exact. */
  capacity?: number;
  className?: string;
}) {
  const lit = Math.min(count, capacity);
  return (
    <div className={`flex items-center gap-[5px] ${className}`} aria-hidden>
      {Array.from({ length: capacity }).map((_, i) => {
        const on = i < lit;
        const warm = on && i === lit - 1;
        return (
          <span
            key={i}
            className={`cp-reso-dot ${on ? "on" : ""} ${warm ? "warm" : ""}`}
          />
        );
      })}
    </div>
  );
}
