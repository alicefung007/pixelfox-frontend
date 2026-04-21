import type { TFunction } from "i18next";
import { toast } from "sonner";

import type { PaletteDefinition } from "@/lib/palettes";
import { hexLabel, normalizeHex } from "@/lib/utils";

function getSwatchLabel(color: string, palette: PaletteDefinition) {
  const normalized = normalizeHex(color);
  const swatch = palette.swatches.find((item) => normalizeHex(item.color) === normalized);
  return swatch?.label ?? hexLabel(color);
}

export function showPaletteRemapToast(params: {
  fromColor: string;
  toColor: string;
  palette: PaletteDefinition;
  t: TFunction;
}) {
  const { fromColor, toColor, palette, t } = params;
  if (normalizeHex(fromColor) === normalizeHex(toColor)) return;

  toast(t("palette.remapNotice.title"), {
    description: t("palette.remapNotice.description", {
      from: getSwatchLabel(fromColor, palette),
      to: getSwatchLabel(toColor, palette),
      palette: palette.i18nKey ? t(palette.i18nKey) : palette.name,
    }),
    duration: 2800,
  });
}
