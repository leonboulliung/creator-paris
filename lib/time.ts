/** Compact "expires in" label. Returns "EXPIRED" for past timestamps. */
export function expiresIn(ts: number, now: number = Date.now()): string {
  const s = Math.floor((ts - now) / 1000);
  if (s <= 0) return "EXPIRED";
  if (s < 60) return `${s}s left`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m left`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h left`;
  const d = Math.floor(h / 24);
  return `${d}d left`;
}

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

export function parisNow(): Date {
  // returns a Date object whose getHours()/getMinutes() reflect Europe/Paris
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

/** Hour-of-day in Europe/Paris for a given epoch ms timestamp. */
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
