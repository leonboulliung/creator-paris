import { parisHour } from "./time";

// ============================================================
// Time of Day — drives map tints, header label, vibe filters.
// ============================================================

export type TimeOfDay = "dawn" | "morning" | "midday" | "golden" | "evening" | "night";

export function timeOfDayFromHour(h: number = parisHour()): TimeOfDay {
  const hour = ((h % 24) + 24) % 24;
  if (hour < 6) return "night";
  if (hour < 8) return "dawn";
  if (hour < 11) return "morning";
  if (hour < 15) return "midday";
  if (hour < 18) return "golden";
  if (hour < 21) return "evening";
  return "night";
}

/**
 * Astronomical time-of-day for a specific location, derived from the
 * sun's real position. Uses SunCalc to get today's twilight + golden
 * hour + sunrise/sunset moments, then maps the current instant onto
 * our six-state palette.
 *
 * Falls back to the hour-based mapping for poles or unparseable dates.
 */
export function timeOfDayFromSun(
  now: Date,
  lat: number,
  lng: number,
): TimeOfDay {
  // SunCalc is CJS so we lazy-require inside the function to keep the
  // module ESM-importable on the server.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SunCalc = require("suncalc") as typeof import("suncalc");
  const t = SunCalc.getTimes(now, lat, lng);
  const ms = now.getTime();

  const dawn = t.dawn.getTime();
  const dusk = t.dusk.getTime();
  const sunriseEnd = t.sunriseEnd.getTime();
  const solarNoon = t.solarNoon.getTime();
  const goldenHour = t.goldenHour.getTime();
  const sunset = t.sunset.getTime();

  if (
    Number.isNaN(dawn) || Number.isNaN(dusk) ||
    Number.isNaN(sunriseEnd) || Number.isNaN(solarNoon) ||
    Number.isNaN(goldenHour) || Number.isNaN(sunset)
  ) {
    return timeOfDayFromHour(now.getHours());
  }

  if (ms < dawn) return "night";
  if (ms < sunriseEnd) return "dawn";
  if (ms < solarNoon) return "morning";
  if (ms < goldenHour) return "midday";
  if (ms < sunset) return "golden";
  if (ms < dusk) return "evening";
  return "night";
}

export const TOD_LABEL: Record<TimeOfDay, string> = {
  dawn: "DAWN",
  morning: "MORNING",
  midday: "MIDDAY",
  golden: "GOLDEN HOUR",
  evening: "EVENING",
  night: "NIGHT",
};

// ============================================================
// Tags — free-form descriptors. Lowercase, hyphenated, max 24 chars.
// ============================================================

const TAG_RE = /^[a-z0-9][a-z0-9-]{0,23}$/;

/** Normalize raw user/AI input into a valid tag, or empty string if not salvageable. */
export function normalizeTag(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return TAG_RE.test(cleaned) ? cleaned : "";
}

/** Dedupe + clean an array of raw tag inputs. Caps at `max`. */
export function normalizeTags(raw: unknown, max = 5): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = normalizeTag(item);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}
