import type { PaletteDefinition, PaletteSwatch } from "@/lib/palettes";
import { getRgbColorDistance } from "@/lib/utils";

export const PATTERN_GRID_COLORS = [
  "#DCE6F2",
  "#000000",
  "#374151",
  "#EF4444",
  "#2563EB",
  "#22C55E",
  "#F59E0B",
  "#A855F7",
  "#EC4899",
  "#06B6D4",
  "#E6D8B5",
  "#F9FAFB",
] as const;

export function clampPatternGridInterval(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(30, Math.max(1, Math.round(value)));
}

export function sanitizePatternGridColor(color: unknown, fallback: string) {
  return typeof color === "string" && PATTERN_GRID_COLORS.includes(color as (typeof PATTERN_GRID_COLORS)[number])
    ? color
    : fallback;
}

export function getNearWhiteSwatches(palette: PaletteDefinition | undefined, limit = 6): PaletteSwatch[] {
  return [...(palette?.swatches ?? [])]
    .sort((a, b) => {
      const distance = getRgbColorDistance(a.color, "#FFFFFF") - getRgbColorDistance(b.color, "#FFFFFF");
      if (distance !== 0) return distance;
      return a.label.localeCompare(b.label);
    })
    .slice(0, limit);
}
