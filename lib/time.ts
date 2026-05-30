export function timeAgo(ts: number, now: number = Date.now()): string {
  const s = Math.max(1, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(d / 365)}y`;
}

/** Legacy alias used by some surfaces. Returns a "starts in X" / "started" style. */
export function expiresIn(ts: number, now: number = Date.now()): string {
  return startsLabel(ts, now);
}

const fmtHM = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const fmtWeekday = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  weekday: "short",
});
const fmtDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  day: "2-digit",
  month: "short",
});
const fmtFull = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function parisDayKey(ts: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

/** Human-friendly "when does it start" label, anchored to Paris time. */
export function startsLabel(ts: number, now: number = Date.now()): string {
  const diff = ts - now;
  if (diff <= 0) return "STARTED";

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `IN ${minutes}M`;

  const todayKey = parisDayKey(now);
  const tomorrowKey = parisDayKey(now + 86_400_000);
  const targetKey = parisDayKey(ts);

  const hm = fmtHM.format(new Date(ts));
  if (targetKey === todayKey) return `TODAY · ${hm}`;
  if (targetKey === tomorrowKey) return `TOMORROW · ${hm}`;

  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24 * 7) {
    return `${fmtWeekday.format(new Date(ts)).toUpperCase()} · ${hm}`;
  }
  return `${fmtDate.format(new Date(ts)).toUpperCase()} · ${hm}`;
}

/** Full date+time for detail tiles (Paris-anchored). */
export function fullStartLabel(ts: number): string {
  return fmtFull.format(new Date(ts));
}

/** HH:MM in Paris time for a given instant. */
export function parisClockLabel(ts: number): string {
  return fmtHM.format(new Date(ts));
}

/**
 * Convert Paris wall-clock components into the real UTC instant (ms).
 * "28 May 15:00 in Paris" → the correct epoch ms regardless of where the
 * user's browser actually sits. This is the anchor that fixes time drift
 * for non-Paris clients.
 */
export function parisWallTimeToMs(
  y: number, mo: number, d: number, h: number, mi: number,
): number {
  // Pretend the components are UTC, then measure how Paris renders that
  // instant and correct by the offset.
  const asUTC = Date.UTC(y, mo, d, h, mi);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(asUTC));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  // Intl can emit hour "24" at midnight — normalize to 0.
  const hh = get("hour") % 24;
  const parisAsUTC = Date.UTC(
    get("year"), get("month") - 1, get("day"), hh, get("minute"), get("second"),
  );
  const offset = parisAsUTC - asUTC;
  return asUTC - offset;
}

/** Extract Paris wall-clock parts from an instant. */
export function parisParts(ts: number): {
  y: number; mo: number; d: number; h: number; mi: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(ts));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  return { y: get("year"), mo: get("month") - 1, d: get("day"), h: get("hour") % 24, mi: get("minute") };
}

/**
 * Reinterpret a Date's *wall-clock* fields as Paris time and return the
 * real UTC instant. The composer builds Dates in client-local time; this
 * treats the hours/minutes the user actually picked as Paris time.
 */
export function wallClockToParisMs(d: Date): number {
  return parisWallTimeToMs(
    d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(),
  );
}

export function parisNow(): Date {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  const d = new Date();
  d.setFullYear(get("year"), get("month") - 1, get("day"));
  d.setHours(get("hour"), get("minute"), get("second"), 0);
  return d;
}

export function parisHour(): number {
  return parisNow().getHours();
}

import { PARIS_CENTER } from "./quartiers";
import { timeOfDayFromSun, type TimeOfDay } from "./vibe";

/** Real-time astronomical time-of-day for Paris (uses SunCalc). */
export function parisTimeOfDay(now: Date = new Date()): TimeOfDay {
  return timeOfDayFromSun(now, PARIS_CENTER[0], PARIS_CENTER[1]);
}

export function formatParisClock(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
