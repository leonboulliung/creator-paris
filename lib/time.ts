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

/** Full date+time for detail tiles. */
export function fullStartLabel(ts: number): string {
  return fmtFull.format(new Date(ts));
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

export function parisHourOf(ts: number): number {
  const h = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hour12: false,
  })
    .formatToParts(new Date(ts))
    .find((p) => p.type === "hour")?.value;
  return h ? Number(h) % 24 : new Date(ts).getHours();
}

export function formatParisClock(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Suggested "next sensible moment" chips, computed from local now. */
export interface WhenChip {
  label: string;
  ts: number;
}

export function buildWhenChips(now: Date = new Date()): WhenChip[] {
  const chips: WhenChip[] = [];
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const minLead = now.getTime() + 60 * 60 * 1000; // at least 1h from now

  function chip(label: string, daysAhead: number, hour: number) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() + daysAhead);
    d.setHours(hour, 0, 0, 0);
    if (d.getTime() < minLead) return;
    chips.push({ label, ts: d.getTime() });
  }

  // Tonight
  chip("TONIGHT · 19H", 0, 19);
  chip("TONIGHT · 21H", 0, 21);

  // Tomorrow
  chip("TOMORROW · 19H", 1, 19);
  chip("TOMORROW · 21H", 1, 21);

  // Next Saturday afternoon
  const dow = now.getDay(); // 0=Sun ... 6=Sat
  const daysToSat = (6 - dow + 7) % 7 || 7;
  chip("THIS SAT · 14H", daysToSat, 14);
  chip("THIS SAT · 20H", daysToSat, 20);

  // Limit to a tidy 4
  return chips.slice(0, 4);
}

/** Convert a Date to the value format expected by <input type="datetime-local">. */
export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
