import { createColorMatcher } from "@/lib/image-processor";
import type { PaletteDefinition } from "@/lib/palettes";
import { hexToRgb, normalizeHex } from "@/lib/utils";

export function resolvePaletteColor(color: string, palette: PaletteDefinition) {
  const normalizedColor = normalizeHex(color);
  const exactMatch = palette.swatches.find(
    (swatch) => normalizeHex(swatch.color) === normalizedColor
  );

  if (exactMatch) {
    return exactMatch.color;
  }

  if (palette.swatches.length === 0) {
    return color;
  }

  const rgb = hexToRgb(normalizedColor);
  if (!rgb) return color;

  const { r, g, b } = rgb;
  const matcher = createColorMatcher(palette);
  return matcher.findNearestColor(r, g, b).hex;
}
