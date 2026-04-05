import type { PaletteDefinition } from "@/lib/palettes/types";
import { MARD_PALETTE } from "@/lib/palettes/mard";
import { MARD24_PALETTE } from "@/lib/palettes/mard24";

export type { PaletteDefinition, PaletteSwatch } from "@/lib/palettes/types";
export { MARD_PALETTE } from "@/lib/palettes/mard";
export { MARD24_PALETTE } from "@/lib/palettes/mard24";

export const SYSTEM_PALETTES = [MARD_PALETTE, MARD24_PALETTE] as const satisfies readonly PaletteDefinition[];

export const SYSTEM_PALETTE_BY_ID = Object.fromEntries(
  SYSTEM_PALETTES.map((p) => [p.id, p])
) as Record<string, PaletteDefinition>;

export type SystemPaletteId = (typeof SYSTEM_PALETTES)[number]["id"];

export function getSystemPalette(id: string) {
  return SYSTEM_PALETTE_BY_ID[id];
}

