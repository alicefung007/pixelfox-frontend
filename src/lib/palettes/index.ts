import type { PaletteDefinition } from "@/lib/palettes/types";
import { MARD_PALETTE } from "@/lib/palettes/mard";
import { MARD24_PALETTE } from "@/lib/palettes/mard24";
import { MARD221_PALETTE } from "@/lib/palettes/mard221";
import { MARD48_PALETTE } from "@/lib/palettes/mard48";
import { MARD72_PALETTE } from "@/lib/palettes/mard72";
import { MARD96_PALETTE } from "@/lib/palettes/mard96";
import { MARD120_PALETTE } from "@/lib/palettes/mard120";
import { MARD144_PALETTE } from "@/lib/palettes/mard144";
import { MARD216_PALETTE } from "@/lib/palettes/mard216";
import { MARD264_PALETTE } from "@/lib/palettes/mard264";
import { MIXIAOWO_PALETTE } from "@/lib/palettes/mixiaowo";
import { COCO_PALETTE } from "@/lib/palettes/coco";
import { MANMAN_PALETTE } from "@/lib/palettes/manman";
import { PANPAN_PALETTE } from "@/lib/palettes/panpan";

export type { PaletteDefinition, PaletteSwatch } from "@/lib/palettes/types";
export { MARD_PALETTE } from "@/lib/palettes/mard";
export { MARD24_PALETTE } from "@/lib/palettes/mard24";
export { MARD221_PALETTE } from "@/lib/palettes/mard221";
export { MARD48_PALETTE } from "@/lib/palettes/mard48";
export { MARD72_PALETTE } from "@/lib/palettes/mard72";
export { MARD96_PALETTE } from "@/lib/palettes/mard96";
export { MARD120_PALETTE } from "@/lib/palettes/mard120";
export { MARD144_PALETTE } from "@/lib/palettes/mard144";
export { MARD216_PALETTE } from "@/lib/palettes/mard216";
export { MARD264_PALETTE } from "@/lib/palettes/mard264";
export { MIXIAOWO_PALETTE } from "@/lib/palettes/mixiaowo";
export { COCO_PALETTE } from "@/lib/palettes/coco";
export { MANMAN_PALETTE } from "@/lib/palettes/manman";
export { PANPAN_PALETTE } from "@/lib/palettes/panpan";

export const SYSTEM_PALETTES = [
  MARD_PALETTE,
  MARD264_PALETTE,
  MARD216_PALETTE,
  MARD144_PALETTE,
  MARD120_PALETTE,
  MARD96_PALETTE,
  MARD72_PALETTE,
  MARD48_PALETTE,
  MARD24_PALETTE,
  MARD221_PALETTE,
  MIXIAOWO_PALETTE,
  COCO_PALETTE,
  MANMAN_PALETTE,
  PANPAN_PALETTE
] as const satisfies readonly PaletteDefinition[];

export const SYSTEM_PALETTE_BY_ID = Object.fromEntries(
  SYSTEM_PALETTES.map((p) => [p.id, p])
) as Record<string, PaletteDefinition>;

export type SystemPaletteId = (typeof SYSTEM_PALETTES)[number]["id"];

export function getSystemPalette(id: string) {
  return SYSTEM_PALETTE_BY_ID[id];
}

