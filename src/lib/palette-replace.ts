import { useEditorStore } from "@/store/useEditorStore";
import { usePaletteStore } from "@/store/usePaletteStore";
import { normalizeHex } from "@/lib/utils";

type ReplaceCanvasColorParams = {
  sourceColor: string;
  replacementColor: string;
  pixelKeys?: string[];
  selectReplacementColor?: boolean;
};

type ReplaceCanvasColorResult =
  | { changed: true; replacementColor: string }
  | { changed: false; replacementColor: string };

export function replaceCanvasColor({
  sourceColor,
  replacementColor,
  pixelKeys,
  selectReplacementColor = false,
}: ReplaceCanvasColorParams): ReplaceCanvasColorResult {
  const normalizedSourceColor = normalizeHex(sourceColor);
  const nextColor = `#${normalizeHex(replacementColor)}`;

  if (normalizedSourceColor === normalizeHex(nextColor)) {
    return { changed: false, replacementColor: nextColor };
  }

  const targetPixelKeySet = pixelKeys ? new Set(pixelKeys) : null;
  let changed = false;
  const { pixels, setPixels, saveHistory, setColor } = useEditorStore.getState();
  const nextPixels: Record<string, string> = {};

  for (const [key, color] of Object.entries(pixels)) {
    const isTargetPixel = targetPixelKeySet
      ? targetPixelKeySet.has(key) && normalizeHex(color) === normalizedSourceColor
      : normalizeHex(color) === normalizedSourceColor;

    if (isTargetPixel) {
      nextPixels[key] = nextColor;
      changed = true;
    } else {
      nextPixels[key] = color;
    }
  }

  if (!changed) {
    return { changed: false, replacementColor: nextColor };
  }

  setPixels(nextPixels);
  saveHistory();
  setColor(nextColor);
  if (selectReplacementColor && !targetPixelKeySet) {
    usePaletteStore.getState().setSelectedUsedColor(nextColor);
  }

  return { changed: true, replacementColor: nextColor };
}
