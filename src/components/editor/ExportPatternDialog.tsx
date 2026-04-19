import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { getSystemPalette } from "@/lib/palettes";
import { createColorMatcher } from "@/lib/image-processor";
import { cn, isDarkColor, normalizeHex } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";
import { usePaletteStore } from "@/store/usePaletteStore";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type RenderResult = {
  dataUrl: string;
  width: number;
  height: number;
};

const GRID_COLORS = [
  "#000000",
  "#374151",
  "#9CA3AF",
  "#F9FAFB",
  "#EF4444",
  "#2563EB",
  "#22C55E",
  "#F59E0B",
  "#A855F7",
  "#EC4899",
  "#06B6D4",
];

const CELL_SIZE = 40;
const AXIS_SIZE = 28;
const MAX_EXPORT_EDGE = 4096;
const MAJOR_GRID_WIDTH = 2;
const MINOR_GRID_WIDTH = 1;

function getPixelBounds(pixels: Record<string, string>, width: number, height: number): Bounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (const key of Object.keys(pixels)) {
    const [x, y] = key.split(",").map(Number);
    if (Number.isNaN(x) || Number.isNaN(y)) continue;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  if (maxX < 0 || maxY < 0) return null;
  return { minX, minY, maxX, maxY };
}

function clampCellSize(cellSize: number, cols: number, rows: number, axisSize: number) {
  const maxAxis = axisSize * 2;
  const maxByWidth = Math.floor((MAX_EXPORT_EDGE - maxAxis) / Math.max(cols, 1));
  const maxByHeight = Math.floor((MAX_EXPORT_EDGE - maxAxis) / Math.max(rows, 1));
  return Math.max(8, Math.min(cellSize, maxByWidth, maxByHeight));
}

function getContrastText(color: string) {
  return isDarkColor(color) ? "#FFFFFF" : "rgba(17,24,39,0.78)";
}

function hexToRgbTuple(hex: string) {
  const normalized = normalizeHex(hex);
  if (normalized.length !== 6) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function renderPatternImage(options: {
  pixels: Record<string, string>;
  width: number;
  height: number;
  paletteLabels: Map<string, string>;
  autoCrop: boolean;
  removeWhiteBackground: boolean;
  showGrid: boolean;
  showMinorGrid: boolean;
  gridInterval: number;
  gridColor: string;
  showAxis: boolean;
  showColorCode: boolean;
  mirrorFlip: boolean;
}): RenderResult | null {
  if (typeof document === "undefined") return null;

  const {
    pixels,
    width,
    height,
    paletteLabels,
    autoCrop,
    removeWhiteBackground,
    showGrid,
    showMinorGrid,
    gridInterval,
    gridColor,
    showAxis,
    showColorCode,
    mirrorFlip,
  } = options;

  const sourceBounds = autoCrop ? getPixelBounds(pixels, width, height) : null;
  if (autoCrop && !sourceBounds) return null;

  const bounds = sourceBounds ?? {
    minX: 0,
    minY: 0,
    maxX: width - 1,
    maxY: height - 1,
  };

  const cols = bounds.maxX - bounds.minX + 1;
  const rows = bounds.maxY - bounds.minY + 1;
  if (cols <= 0 || rows <= 0) return null;

  const axisSize = showAxis ? AXIS_SIZE : 0;
  const cellSize = clampCellSize(CELL_SIZE, cols, rows, axisSize);
  const exportWidth = cols * cellSize + axisSize * 2;
  const exportHeight = rows * cellSize + axisSize * 2;

  const canvas = document.createElement("canvas");
  canvas.width = exportWidth;
  canvas.height = exportHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gridOriginX = axisSize;
  const gridOriginY = axisSize;
  const contentWidth = cols * cellSize;
  const contentHeight = rows * cellSize;

  if (!removeWhiteBackground) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, exportWidth, exportHeight);
  } else {
    ctx.clearRect(0, 0, exportWidth, exportHeight);
  }

  if (showAxis) {
    ctx.fillStyle = removeWhiteBackground ? "rgba(248,250,252,0.96)" : "#F8FAFC";
    ctx.fillRect(0, 0, exportWidth, axisSize);
    ctx.fillRect(0, exportHeight - axisSize, exportWidth, axisSize);
    ctx.fillRect(0, 0, axisSize, exportHeight);
    ctx.fillRect(exportWidth - axisSize, 0, axisSize, exportHeight);
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const sourceX = mirrorFlip ? bounds.maxX - col : bounds.minX + col;
      const sourceY = bounds.minY + row;
      const color = pixels[`${sourceX},${sourceY}`];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(
        gridOriginX + col * cellSize,
        gridOriginY + row * cellSize,
        cellSize,
        cellSize
      );
    }
  }

  if (showColorCode) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const sourceX = mirrorFlip ? bounds.maxX - col : bounds.minX + col;
        const sourceY = bounds.minY + row;
        const color = pixels[`${sourceX},${sourceY}`];
        if (!color) continue;

        const normalized = normalizeHex(color);
        const label = paletteLabels.get(normalized);
        if (!label) continue;
        const text = label;
        const fontSize = Math.max(8, Math.min(14, Math.floor(cellSize / Math.max(text.length * 0.62, 2.8))));
        ctx.font = `700 ${fontSize}px Geist, sans-serif`;
        ctx.fillStyle = getContrastText(color);
        ctx.fillText(
          text,
          gridOriginX + col * cellSize + cellSize / 2,
          gridOriginY + row * cellSize + cellSize / 2
        );
      }
    }
  }

  if (showGrid) {
    if (showMinorGrid) {
      ctx.strokeStyle = gridColor;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = MINOR_GRID_WIDTH;
      ctx.beginPath();
      for (let col = 0; col <= cols; col += 1) {
        const x = gridOriginX + col * cellSize + 0.5;
        ctx.moveTo(x, gridOriginY);
        ctx.lineTo(x, gridOriginY + contentHeight);
      }
      for (let row = 0; row <= rows; row += 1) {
        const y = gridOriginY + row * cellSize + 0.5;
        ctx.moveTo(gridOriginX, y);
        ctx.lineTo(gridOriginX + contentWidth, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = MAJOR_GRID_WIDTH;
    ctx.beginPath();
    for (let col = 0; col <= cols; col += gridInterval) {
      const x = gridOriginX + col * cellSize + 0.5;
      ctx.moveTo(x, gridOriginY);
      ctx.lineTo(x, gridOriginY + contentHeight);
    }
    if (cols % gridInterval !== 0) {
      const x = gridOriginX + contentWidth + 0.5;
      ctx.moveTo(x, gridOriginY);
      ctx.lineTo(x, gridOriginY + contentHeight);
    }
    for (let row = 0; row <= rows; row += gridInterval) {
      const y = gridOriginY + row * cellSize + 0.5;
      ctx.moveTo(gridOriginX, y);
      ctx.lineTo(gridOriginX + contentWidth, y);
    }
    if (rows % gridInterval !== 0) {
      const y = gridOriginY + contentHeight + 0.5;
      ctx.moveTo(gridOriginX, y);
      ctx.lineTo(gridOriginX + contentWidth, y);
    }
    ctx.stroke();
  } else {
    ctx.strokeStyle = "rgba(15,23,42,0.16)";
    ctx.lineWidth = 1;
    ctx.strokeRect(gridOriginX + 0.5, gridOriginY + 0.5, contentWidth, contentHeight);
  }

  if (showAxis) {
    ctx.fillStyle = "#334155";
    ctx.font = `600 ${Math.max(10, Math.floor(axisSize * 0.42))}px Geist, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let col = 0; col < cols; col += 1) {
      const text = String(mirrorFlip ? bounds.maxX - col + 1 : bounds.minX + col + 1);
      const x = gridOriginX + col * cellSize + cellSize / 2;
      ctx.fillText(text, x, axisSize / 2);
      ctx.fillText(text, x, exportHeight - axisSize / 2);
    }

    for (let row = 0; row < rows; row += 1) {
      const text = String(bounds.minY + row + 1);
      const y = gridOriginY + row * cellSize + cellSize / 2;
      ctx.fillText(text, axisSize / 2, y);
      ctx.fillText(text, exportWidth - axisSize / 2, y);
    }
  }

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: exportWidth,
    height: exportHeight,
  };
}

export default function ExportPatternDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const pixels = useEditorStore((state) => state.pixels);
  const width = useEditorStore((state) => state.width);
  const height = useEditorStore((state) => state.height);
  const currentPaletteId = usePaletteStore((state) => state.currentPaletteId);
  const [autoCrop, setAutoCrop] = useState(true);
  const [removeWhiteBackground, setRemoveWhiteBackground] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showMinorGrid, setShowMinorGrid] = useState(true);
  const [gridInterval, setGridInterval] = useState([5]);
  const [gridColor, setGridColor] = useState(GRID_COLORS[0]);
  const [showAxis, setShowAxis] = useState(false);
  const [showColorCode, setShowColorCode] = useState(true);
  const [mirrorFlip, setMirrorFlip] = useState(false);

  const paletteLabels = useMemo(() => {
    const palette = getSystemPalette(currentPaletteId);
    if (!palette) return new Map<string, string>();

    const matcher = createColorMatcher(palette);
    const resolved = new Map<string, string>();
    const uniqueColors = new Set(Object.values(pixels).map((color) => normalizeHex(color)));

    uniqueColors.forEach((color) => {
      const rgb = hexToRgbTuple(color);
      if (!rgb) return;
      const exactLabel = palette.swatches.find((swatch) => normalizeHex(swatch.color) === color)?.label;
      if (exactLabel) {
        resolved.set(color, exactLabel);
        return;
      }
      const nearest = matcher.findNearestColor(rgb.r, rgb.g, rgb.b);
      resolved.set(color, nearest.label);
    });

    return resolved;
  }, [currentPaletteId, pixels]);

  const exportResult = useMemo(
    () =>
      renderPatternImage({
        pixels,
        width,
        height,
        paletteLabels,
        autoCrop,
        removeWhiteBackground,
        showGrid,
        showMinorGrid,
        gridInterval: gridInterval[0],
        gridColor,
        showAxis,
        showColorCode,
        mirrorFlip,
      }),
    [
      pixels,
      width,
      height,
      paletteLabels,
      autoCrop,
      removeWhiteBackground,
      showGrid,
      showMinorGrid,
      gridInterval,
      gridColor,
      showAxis,
      showColorCode,
      mirrorFlip,
    ]
  );

  const handleDownload = () => {
    if (!exportResult || typeof document === "undefined") return;

    const link = document.createElement("a");
    link.href = exportResult.dataUrl;
    link.download = `pixelfox-pattern-${width}x${height}.png`;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[980px] w-[calc(100vw-32px)] md:w-full p-0 flex flex-col gap-0 max-h-[95vh]">
        <DialogHeader className="px-3 pt-3 pb-2 md:px-6 md:pt-6 md:pb-4 shrink-0 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Download className="size-4" />
                </span>
                <span>{t("editor.exportDialog.title")}</span>
              </DialogTitle>
              <DialogDescription>{t("editor.exportDialog.description")}</DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X className="size-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <Separator className="shrink-0" />

        <div className="flex-1 overflow-auto px-3 pb-3 md:px-6 md:pb-6 flex flex-col md:flex-row gap-3 md:gap-5">
          <div className="w-full md:w-[260px] md:shrink-0 space-y-3 md:space-y-4">
            <div className="space-y-4 pt-3">
              <h3 className="text-sm font-semibold">Settings</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-[11px] font-semibold">{t("editor.exportDialog.autoCrop")}</Label>
                    <div className="text-[10px] text-muted-foreground">
                      {t("editor.exportDialog.autoCropHint")}
                    </div>
                  </div>
                  <Switch
                    checked={autoCrop}
                    onCheckedChange={setAutoCrop}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-[11px] font-semibold">{t("editor.exportDialog.removeWhiteBackground")}</Label>
                  <Switch
                    checked={removeWhiteBackground}
                    onCheckedChange={setRemoveWhiteBackground}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-[11px] font-semibold">{t("editor.exportDialog.showColorCode")}</Label>
                  <Switch
                    checked={showColorCode}
                    onCheckedChange={setShowColorCode}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-[11px] font-semibold">{t("editor.exportDialog.showAxis")}</Label>
                    <div className="text-[10px] text-muted-foreground">
                      {t("editor.exportDialog.showAxisHint")}
                    </div>
                  </div>
                  <Switch
                    checked={showAxis}
                    onCheckedChange={setShowAxis}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-[11px] font-semibold">{t("editor.exportDialog.mirrorFlip")}</Label>
                    <div className="text-[10px] text-muted-foreground">
                      {t("editor.exportDialog.mirrorFlipHint")}
                    </div>
                  </div>
                  <Switch
                    checked={mirrorFlip}
                    onCheckedChange={setMirrorFlip}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
              </div>
            </div>

            <Separator className="shrink-0" />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Grid</h3>

              <div className="flex items-center justify-between gap-3">
                <Label className="text-[11px] font-semibold">{t("editor.exportDialog.showGrid")}</Label>
                <Switch
                  checked={showGrid}
                  onCheckedChange={setShowGrid}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <Label className={cn("text-[11px] font-semibold", !showGrid && "text-muted-foreground")}>
                  {t("editor.exportDialog.showMinorGrid")}
                </Label>
                <Switch
                  checked={showMinorGrid}
                  onCheckedChange={setShowMinorGrid}
                  disabled={!showGrid}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className={cn("text-[11px] font-semibold", !showGrid && "text-muted-foreground")}>
                    {t("editor.exportDialog.gridInterval")}
                  </Label>
                  <span className={cn("text-[11px] font-medium", !showGrid && "text-muted-foreground")}>
                    {gridInterval[0]}
                  </span>
                </div>
                <Slider
                  value={gridInterval}
                  onValueChange={setGridInterval}
                  min={1}
                  max={20}
                  disabled={!showGrid}
                  className={cn(
                    "[&_[data-slot=slider-range]]:bg-primary",
                    !showGrid && "[&_[data-slot=slider-range]]:bg-muted"
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label className={cn("text-[11px] font-semibold", !showGrid && "text-muted-foreground")}>
                  {t("editor.exportDialog.gridColor")}
                </Label>
                <div className={cn("grid grid-cols-6 gap-2", !showGrid && "opacity-50 pointer-events-none")}>
                  {GRID_COLORS.map((c) => {
                    const selected = c.toLowerCase() === gridColor.toLowerCase();
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setGridColor(c)}
                        className={cn(
                          "w-full aspect-square rounded-md border-2 transition-transform hover:scale-105 active:scale-95",
                          selected
                            ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.16)]"
                            : "border-gray-400/20"
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={c}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-3 md:space-y-4 pb-3 md:pb-4">
            <div className="pt-3">
              <h3 className="text-sm font-semibold">{t("editor.exportDialog.preview")}</h3>
            </div>

            <div className="rounded-xl border overflow-hidden flex items-center justify-center min-h-[420px] p-4 bg-[linear-gradient(45deg,#f5f5f5_25%,transparent_25%,transparent_75%,#f5f5f5_75%,#f5f5f5),linear-gradient(45deg,#f5f5f5_25%,transparent_25%,transparent_75%,#f5f5f5_75%,#f5f5f5)] bg-[length:10px_10px] bg-[position:0_0,5px_5px] bg-repeat">
              {exportResult ? (
                <div className="bg-transparent p-3">
                  <img
                    src={exportResult.dataUrl}
                    alt={t("editor.exportDialog.previewTitle")}
                    className="max-h-[520px] max-w-full object-contain mx-auto [image-rendering:pixelated]"
                  />
                </div>
              ) : (
                <div className="aspect-[3/4] w-full max-w-[420px] rounded-md border bg-transparent flex items-center justify-center text-sm text-muted-foreground">
                  {t("editor.exportDialog.previewPlaceholder")}
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="shrink-0" />

        <div className="px-3 py-2.5 md:px-6 md:py-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              {t("editor.exportDialog.close")}
            </Button>
          </DialogClose>
          <Button
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-none text-white font-medium"
            type="button"
            onClick={handleDownload}
            disabled={!exportResult}
          >
            <Download className="size-4" />
            {t("editor.exportDialog.downloadImage")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
