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

const DEFAULT_COLOR = "#0a0a0a";

/**
 * Resolve the dominant color for a card. Explicit author choice wins; if
 * unset we fall back to a stable hash-derived shade from the palette.
 * Hash is deterministic per title so the same card always looks the same.
 */
export function cardColor(card: { color?: string | null; title?: string }): string {
  if (card.color) return card.color;
  return paletteFromString(card.title || "");
}

/**
 * Stable color pick from the curated palette, hashed off any string.
 * Used when the author didn't choose one explicitly.
 */
export function paletteFromString(seed: string): string {
  if (!seed) return DEFAULT_COLOR;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = (h >>> 0) % COLOR_PALETTE.length;
  return COLOR_PALETTE[idx].value;
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
