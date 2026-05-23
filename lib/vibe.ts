import { parisHour } from "./time";

export type Activity =
  | "film"
  | "music"
  | "build"
  | "sport"
  | "food"
  | "art"
  | "walk"
  | "read"
  | "talk"
  | "default";

export type TimeOfDay = "dawn" | "morning" | "midday" | "golden" | "evening" | "night";

const ACTIVITY_PATTERNS: { activity: Activity; re: RegExp }[] = [
  { activity: "film", re: /\b(film|cin[eé]ma|movie|screening|projection|s[eé]ance|doc|short)\b/i },
  { activity: "music", re: /\b(music|musique|concert|gig|dj|live|jam|vinyle|vinyl|techno|jazz|punk|opera)\b/i },
  { activity: "build", re: /\b(build|hack|code|coding|workshop|atelier|prototype|maker|startup|hackathon)\b/i },
  { activity: "sport", re: /\b(run|running|sport|football|basket|ride|cycle|v[eé]lo|yoga|swim|piscine|skate|tennis|boxing|boxe)\b/i },
  { activity: "food", re: /\b(food|d[iî]ner|dinner|lunch|d[eé]jeuner|cook|cooking|brunch|repas|cuisine|meal|wine|vin|bar|caf[eé])\b/i },
  { activity: "art", re: /\b(art|expo|exhibition|gallery|galerie|museum|mus[eé]e|paint|painting|draw|sculpture|fashion|mode|design)\b/i },
  { activity: "walk", re: /\b(walk|balade|promenade|stroll|hike|d[eé]ambulation|drift|d[eé]rive|flânerie|flanerie)\b/i },
  { activity: "read", re: /\b(read|reading|lecture|book|livre|biblio|library|po[eè]me|poem|poetry|po[eé]sie|writing)\b/i },
  { activity: "talk", re: /\b(talk|caf[eé]|discussion|debate|d[eé]bat|conference|conf[eé]rence|meet|meeting|salon|round\s?table|drink|drinks)\b/i },
];

export function activityFromTitle(title: string): Activity {
  for (const p of ACTIVITY_PATTERNS) if (p.re.test(title)) return p.activity;
  return "default";
}

const ACTIVITY_ACCENT: Record<Activity, string> = {
  film: "#7a1f1f",
  music: "#4b1e7a",
  build: "#c45a14",
  sport: "#225f3a",
  food: "#b8761a",
  art: "#7a1f5e",
  walk: "#3e6b4a",
  read: "#1f5a6b",
  talk: "#8a6a16",
  default: "#2a2a2a",
};

const TOD_PALETTE: Record<
  TimeOfDay,
  { top: string; mid: string; bottom: string; sunY: number; sunColor: string; isNight?: boolean }
> = {
  dawn:    { top: "#f7c9b3", mid: "#f5d2a0", bottom: "#b9c9d6", sunY: 0.72, sunColor: "#ffd9a3" },
  morning: { top: "#cfe2f1", mid: "#f3e3b9", bottom: "#e9d49a", sunY: 0.45, sunColor: "#fff1c2" },
  midday:  { top: "#79a8d6", mid: "#bcd6ee", bottom: "#f1e6c4", sunY: 0.18, sunColor: "#ffffff" },
  golden:  { top: "#3b5d8a", mid: "#e6a05e", bottom: "#f4d28a", sunY: 0.62, sunColor: "#ffb46a" },
  evening: { top: "#3a2a55", mid: "#a05c7a", bottom: "#e0a07a", sunY: 0.78, sunColor: "#ff8e6e" },
  night:   { top: "#06080f", mid: "#0c1426", bottom: "#1a2440", sunY: 0.85, sunColor: "#cfd8e6", isNight: true },
};

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

// Hash a string to a stable 0..1
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // unsigned, normalize
  return ((h >>> 0) % 100000) / 100000;
}

export interface Vibe {
  activity: Activity;
  tod: TimeOfDay;
  accent: string;
  sky: { top: string; mid: string; bottom: string };
  sun: { x: number; y: number; color: string; size: number };
  angle: number; // gradient angle in degrees
  isNight: boolean;
  /** ready-to-use CSS background-image string for layered render */
  cssBackground: string;
}

export function computeVibe(input: {
  title: string;
  label: string;
  /** Paris hour-of-day to anchor the palette (0..23). Defaults to current Paris hour. */
  hour?: number;
}): Vibe {
  const activity = activityFromTitle(input.title);
  const tod = timeOfDayFromHour(input.hour ?? parisHour());
  const accent = ACTIVITY_ACCENT[activity];
  const pal = TOD_PALETTE[tod];

  const h = hash01(input.label || "paris");
  const angle = 175 + Math.round(h * 30); // ~175..205
  const sunX = 0.18 + h * 0.64;            // 0.18..0.82
  const sunY = pal.sunY;
  const sunSize = 18 + Math.round(h * 10); // % of width

  // layered CSS background: sky linear + sun radial + accent radial wash
  const sky = `linear-gradient(${angle}deg, ${pal.top} 0%, ${pal.mid} 55%, ${pal.bottom} 100%)`;
  const sun = `radial-gradient(circle at ${(sunX * 100).toFixed(1)}% ${(sunY * 100).toFixed(1)}%, ${pal.sunColor} 0%, ${pal.sunColor}cc ${sunSize * 0.18}%, transparent ${sunSize}%)`;
  const wash = `radial-gradient(120% 60% at 50% 110%, ${accent}66 0%, transparent 60%)`;

  return {
    activity,
    tod,
    accent,
    sky: { top: pal.top, mid: pal.mid, bottom: pal.bottom },
    sun: { x: sunX, y: sunY, color: pal.sunColor, size: sunSize },
    angle,
    isNight: !!pal.isNight,
    cssBackground: `${wash}, ${sun}, ${sky}`,
  };
}

export const TOD_LABEL: Record<TimeOfDay, string> = {
  dawn: "DAWN",
  morning: "MORNING",
  midday: "MIDDAY",
  golden: "GOLDEN HOUR",
  evening: "EVENING",
  night: "NIGHT",
};

export const ACTIVITY_LABEL: Record<Activity, string> = {
  film: "FILM",
  music: "MUSIC",
  build: "BUILD",
  sport: "SPORT",
  food: "FOOD",
  art: "ART",
  walk: "WALK",
  read: "READ",
  talk: "TALK",
  default: "ONE THING",
};
