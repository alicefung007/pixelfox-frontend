import { createColorMatcher } from "@/lib/image-processor";
import type { PaletteDefinition } from "@/lib/palettes";
import { normalizeHex } from "@/lib/utils";

function hexToRgbTuple(hex: string) {
  const normalized = normalizeHex(hex);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

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

  const { r, g, b } = hexToRgbTuple(normalizedColor);
  const matcher = createColorMatcher(palette);
  return matcher.findNearestColor(r, g, b).hex;
}
