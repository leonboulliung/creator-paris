import type { Activity } from "./vibe";
import { activityFromTitle } from "./vibe";

/** Curated editorial palette — used in the composer chip grid and for fallbacks. */
export const COLOR_PALETTE: { value: string; label: string }[] = [
  { value: "#c2452f", label: "TOMATO" },
  { value: "#c45a14", label: "ORANGE" },
  { value: "#c89438", label: "MUSTARD" },
  { value: "#7c8a3c", label: "OLIVE" },
  { value: "#5a8a6e", label: "SAGE" },
  { value: "#2e7387", label: "TEAL" },
  { value: "#3a5a96", label: "PARIS BLUE" },
  { value: "#7b6ea8", label: "LAVENDER" },
  { value: "#a83a73", label: "MAGENTA" },
  { value: "#6b2a5e", label: "PLUM" },
  { value: "#3a3a3a", label: "SLATE" },
  { value: "#d8c89e", label: "CREAM" },
];

const CATEGORY_FALLBACK: Record<Activity, string> = {
  film: "#c2452f",
  music: "#7b6ea8",
  food: "#c89438",
  art: "#a83a73",
  walk: "#5a8a6e",
  read: "#2e7387",
  talk: "#c45a14",
  build: "#3a3a3a",
  sport: "#7c8a3c",
  default: "#0a0a0a",
};

/**
 * Resolve the dominant color for a card. Explicit author choice wins; if
 * unset (legacy cards), derive from category or title-implied activity.
 */
export function cardColor(card: {
  color?: string | null;
  category?: string | null;
  title?: string;
}): string {
  if (card.color) return card.color;
  return categoryColor(card);
}

/** Category-derived color only (ignores explicit author color). */
export function categoryColor(card: {
  category?: string | null;
  title?: string;
}): string {
  const cat = (card.category as Activity | null) || activityFromTitle(card.title || "");
  return CATEGORY_FALLBACK[cat] || CATEGORY_FALLBACK.default;
}

/** Returns true if a color is dark enough that white text reads well on it. */
export function isDark(hex: string): boolean {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  // Relative luminance per WCAG
  const lum =
    (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum < 0.55;
}
