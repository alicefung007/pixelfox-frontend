import type { TFunction } from "i18next";

import type { PaletteDefinition } from "@/lib/palettes";
import { useNoticeStore } from "@/store/useNoticeStore";
import { hexLabel, normalizeHex } from "@/lib/utils";

function getSwatchLabel(color: string, palette: PaletteDefinition) {
  const normalized = normalizeHex(color);
  const swatch = palette.swatches.find((item) => normalizeHex(item.color) === normalized);
  return swatch?.label ?? hexLabel(color);
}

export function showPaletteRemapNotice(params: {
  fromColor: string;
  toColor: string;
  palette: PaletteDefinition;
  t: TFunction;
}) {
  const { fromColor, toColor, palette, t } = params;
  if (normalizeHex(fromColor) === normalizeHex(toColor)) return;

  useNoticeStore.getState().showPaletteRemapNotice({
    fromLabel: getSwatchLabel(fromColor, palette),
    toLabel: getSwatchLabel(toColor, palette),
    paletteName: palette.i18nKey ? t(palette.i18nKey) : palette.name,
  });
}
