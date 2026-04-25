import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { getSystemPalette, type PaletteSwatch } from "@/lib/palettes";
import {
  clampPatternGridInterval,
  getNearWhiteSwatches,
  PATTERN_GRID_COLORS,
  sanitizePatternGridColor,
} from "@/components/editor/pattern-dialog-shared";
import { cn, hexToRgb, isDarkColor, normalizeHex } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";
import { usePaletteStore } from "@/store/usePaletteStore";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type AssemblyStep = {
  color: string;
  label: string;
  count: number;
};

type AssemblySettings = {
  showGrid: boolean;
  showMinorGrid: boolean;
  gridInterval: number;
  gridColor: string;
  showAxis: boolean;
  showColorCode: boolean;
  excludedColorCodes: string[];
  mirrorFlip: boolean;
};

const CHECKER_LIGHT = "#F7F7F8";
const CHECKER_DARK = "#ECEEF1";
const ACTIVE_OUTLINE = "#F59E0B";
const AXIS_TEXT_COLOR = "#475569";
const ASSEMBLY_SETTINGS_STORAGE_KEY = "pixelfox-assembly-dialog-settings";
const DEFAULT_ASSEMBLY_SETTINGS: AssemblySettings = {
  showGrid: true,
  showMinorGrid: true,
  gridInterval: 10,
  gridColor: PATTERN_GRID_COLORS[0],
  showAxis: false,
  showColorCode: false,
  excludedColorCodes: [],
  mirrorFlip: false,
};

function getFallbackLabel(index: number) {
  const letter = String.fromCharCode(65 + Math.floor(index / 9));
  return `${letter}${(index % 9) + 1}`;
}

function loadAssemblySettings(): AssemblySettings {
  if (typeof window === "undefined") return DEFAULT_ASSEMBLY_SETTINGS;

  try {
    const raw = window.localStorage.getItem(ASSEMBLY_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_ASSEMBLY_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AssemblySettings>;

    return {
      showGrid: parsed.showGrid ?? DEFAULT_ASSEMBLY_SETTINGS.showGrid,
      showMinorGrid: parsed.showMinorGrid ?? DEFAULT_ASSEMBLY_SETTINGS.showMinorGrid,
      gridInterval: clampPatternGridInterval(
        typeof parsed.gridInterval === "number" ? parsed.gridInterval : Number.NaN,
        DEFAULT_ASSEMBLY_SETTINGS.gridInterval
      ),
      gridColor: sanitizePatternGridColor(parsed.gridColor, DEFAULT_ASSEMBLY_SETTINGS.gridColor),
      showAxis: parsed.showAxis ?? DEFAULT_ASSEMBLY_SETTINGS.showAxis,
      showColorCode: parsed.showColorCode ?? DEFAULT_ASSEMBLY_SETTINGS.showColorCode,
      excludedColorCodes: Array.isArray(parsed.excludedColorCodes) ? parsed.excludedColorCodes : [],
      mirrorFlip: parsed.mirrorFlip ?? DEFAULT_ASSEMBLY_SETTINGS.mirrorFlip,
    };
  } catch {
    return DEFAULT_ASSEMBLY_SETTINGS;
  }
}

function rgba(color: string, alpha: number) {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function drawAssemblyCanvas({
  canvas,
  pixels,
  width,
  height,
  activeColor,
  activeLabel,
  showGrid,
  showMinorGrid,
  gridInterval,
  gridColor,
  showAxis,
  showColorCode,
  excludedColorCodes,
  mirrorFlip,
}: {
  canvas: HTMLCanvasElement;
  pixels: Record<string, string>;
  width: number;
  height: number;
  activeColor: string | null;
  activeLabel: string | null;
  showGrid: boolean;
  showMinorGrid: boolean;
  gridInterval: number;
  gridColor: string;
  showAxis: boolean;
  showColorCode: boolean;
  excludedColorCodes: Set<string>;
  mirrorFlip: boolean;
}) {
  const parent = canvas.parentElement;
  if (!parent) return;

  const rect = parent.getBoundingClientRect();
  const viewWidth = Math.max(1, Math.floor(rect.width));
  const viewHeight = Math.max(1, Math.floor(rect.height));
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewWidth * dpr);
  canvas.height = Math.floor(viewHeight * dpr);
  canvas.style.width = `${viewWidth}px`;
  canvas.style.height = `${viewHeight}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  const axisPadding = showAxis ? 28 : 0;
  const padding = 18;
  const scale = Math.max(
    1,
    Math.floor(
      Math.min(
        (viewWidth - padding * 2 - axisPadding) / width,
        (viewHeight - padding * 2 - axisPadding) / height
      )
    )
  );
  const contentWidth = width * scale;
  const contentHeight = height * scale;
  const totalWidth = contentWidth + axisPadding;
  const totalHeight = contentHeight + axisPadding;
  const offsetX = Math.floor((viewWidth - totalWidth) / 2) + (showAxis ? axisPadding : 0);
  const offsetY = Math.floor((viewHeight - totalHeight) / 2) + (showAxis ? axisPadding : 0);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.imageSmoothingEnabled = false;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? CHECKER_LIGHT : CHECKER_DARK;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  const normalizedActiveColor = activeColor ? normalizeHex(activeColor) : null;
  for (const [key, color] of Object.entries(pixels)) {
    const [x, y] = key.split(",").map(Number);
    if (Number.isNaN(x) || Number.isNaN(y)) continue;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const drawX = mirrorFlip ? width - 1 - x : x;

    if (normalizedActiveColor && normalizeHex(color) === normalizedActiveColor) {
      ctx.fillStyle = ACTIVE_OUTLINE;
      ctx.globalAlpha = 0.16;
      ctx.fillRect(drawX * scale, y * scale, scale, scale);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ACTIVE_OUTLINE;
      ctx.lineWidth = Math.max(2, Math.floor(scale * 0.18));
      ctx.strokeRect(drawX * scale + 1, y * scale + 1, Math.max(1, scale - 2), Math.max(1, scale - 2));
    } else {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.22;
      ctx.fillRect(drawX * scale, y * scale, scale, scale);
      ctx.globalAlpha = 1;
    }
  }

  if (
    showColorCode &&
    normalizedActiveColor &&
    !excludedColorCodes.has(normalizedActiveColor) &&
    activeLabel &&
    scale >= 20
  ) {
    ctx.save();
    ctx.font = `${Math.max(10, Math.floor(scale * 0.32))}px Geist, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(15, 23, 42, 0.68)";
    for (const [key, color] of Object.entries(pixels)) {
      if (normalizeHex(color) !== normalizedActiveColor) continue;
      const [x, y] = key.split(",").map(Number);
      if (Number.isNaN(x) || Number.isNaN(y)) continue;
      const drawX = mirrorFlip ? width - 1 - x : x;
      ctx.fillText(activeLabel, drawX * scale + scale / 2, y * scale + scale / 2);
    }
    ctx.restore();
  }

  if (showGrid) {
    if (showMinorGrid) {
      ctx.strokeStyle = rgba(gridColor, 0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x++) {
        const px = x * scale + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, contentHeight);
      }
      for (let y = 0; y <= height; y++) {
        const py = y * scale + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(contentWidth, py);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = rgba(gridColor, 0.78);
    ctx.lineWidth = Math.max(1.5, Math.floor(scale * 0.08));
    ctx.beginPath();
    for (let x = 0; x <= width; x += gridInterval) {
      const px = x * scale + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, contentHeight);
    }
    if (width % gridInterval !== 0) {
      ctx.moveTo(contentWidth + 0.5, 0);
      ctx.lineTo(contentWidth + 0.5, contentHeight);
    }
    for (let y = 0; y <= height; y += gridInterval) {
      const py = y * scale + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(contentWidth, py);
    }
    if (height % gridInterval !== 0) {
      ctx.moveTo(0, contentHeight + 0.5);
      ctx.lineTo(contentWidth, contentHeight + 0.5);
    }
    ctx.stroke();
  }

  if (showAxis && scale >= 12) {
    ctx.save();
    ctx.fillStyle = AXIS_TEXT_COLOR;
    ctx.font = `${Math.max(10, Math.floor(scale * 0.32))}px Geist, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let x = 0; x < width; x += gridInterval) {
      const sourceX = mirrorFlip ? width - x : x + 1;
      ctx.fillText(String(sourceX), x * scale + scale / 2, -14);
    }
    if ((width - 1) % gridInterval !== 0) {
      ctx.fillText(String(mirrorFlip ? 1 : width), contentWidth - scale / 2, -14);
    }

    ctx.textAlign = "right";
    for (let y = 0; y < height; y += gridInterval) {
      ctx.fillText(String(y + 1), -8, y * scale + scale / 2);
    }
    if ((height - 1) % gridInterval !== 0) {
      ctx.fillText(String(height), -8, contentHeight - scale / 2);
    }
    ctx.restore();
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(17, 24, 39, 0.35)";
  ctx.strokeRect(0, 0, contentWidth, contentHeight);
  ctx.restore();
}

export default function AssemblyDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixels = useEditorStore((state) => state.pixels);
  const width = useEditorStore((state) => state.width);
  const height = useEditorStore((state) => state.height);
  const currentPaletteId = usePaletteStore((state) => state.currentPaletteId);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [completedColors, setCompletedColors] = useState<Set<string>>(() => new Set());
  const currentPalette = useMemo(() => getSystemPalette(currentPaletteId), [currentPaletteId]);
  const nearWhiteSwatches = useMemo<PaletteSwatch[]>(() => getNearWhiteSwatches(currentPalette), [currentPalette]);
  const persistedSettings = useMemo(() => loadAssemblySettings(), []);
  const [showGrid, setShowGrid] = useState(persistedSettings.showGrid);
  const [showMinorGrid, setShowMinorGrid] = useState(persistedSettings.showMinorGrid);
  const [gridInterval, setGridInterval] = useState(persistedSettings.gridInterval);
  const [draftGridInterval, setDraftGridInterval] = useState([persistedSettings.gridInterval]);
  const [gridColor, setGridColor] = useState(persistedSettings.gridColor);
  const [showAxis, setShowAxis] = useState(persistedSettings.showAxis);
  const [showColorCode, setShowColorCode] = useState(persistedSettings.showColorCode);
  const [excludedColorCodes, setExcludedColorCodes] = useState<Set<string>>(
    () => new Set(persistedSettings.excludedColorCodes.map(normalizeHex))
  );
  const [mirrorFlip, setMirrorFlip] = useState(persistedSettings.mirrorFlip);

  const steps = useMemo<AssemblyStep[]>(() => {
    const usage = new Map<string, number>();
    for (const color of Object.values(pixels)) {
      const normalizedColor = normalizeHex(color);
      usage.set(normalizedColor, (usage.get(normalizedColor) ?? 0) + 1);
    }

    const palette = getSystemPalette(currentPaletteId);
    const paletteLabels = new Map(
      palette?.swatches.map((swatch) => [normalizeHex(swatch.color), swatch.label]) ?? []
    );

    return Array.from(usage.entries())
      .map(([color, count], index) => ({
        color,
        count,
        label: paletteLabels.get(color) ?? getFallbackLabel(index),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [currentPaletteId, pixels]);

  const clampedActiveIndex = Math.min(activeIndex, Math.max(steps.length - 1, 0));
  const activeStep = steps[clampedActiveIndex] ?? null;
  const progress = steps.length === 0 ? 0 : Math.round((completedColors.size / steps.length) * 100);
  const excludedColorCodeList = useMemo(() => Array.from(excludedColorCodes), [excludedColorCodes]);

  useEffect(() => {
    if (!open) return;
    const defaultColor = nearWhiteSwatches[0]?.color;
    queueMicrotask(() => {
      setExcludedColorCodes((current) => {
        if (current.size > 0) return current;
        return defaultColor ? new Set([normalizeHex(defaultColor)]) : new Set();
      });
    });
  }, [nearWhiteSwatches, open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      ASSEMBLY_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        showGrid,
        showMinorGrid,
        gridInterval,
        gridColor,
        showAxis,
        showColorCode,
        excludedColorCodes: excludedColorCodeList,
        mirrorFlip,
      } satisfies AssemblySettings)
    );
  }, [excludedColorCodeList, gridColor, gridInterval, mirrorFlip, showAxis, showColorCode, showGrid, showMinorGrid]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      drawAssemblyCanvas({
        canvas,
        pixels,
        width,
        height,
        activeColor: activeStep?.color ?? null,
        activeLabel: activeStep?.label ?? null,
        showGrid,
        showMinorGrid,
        gridInterval,
        gridColor,
        showAxis,
        showColorCode,
        excludedColorCodes,
        mirrorFlip,
      });
    };

    render();
    const resizeObserver = new ResizeObserver(render);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
    return () => resizeObserver.disconnect();
  }, [
    activeStep?.color,
    activeStep?.label,
    gridColor,
    gridInterval,
    height,
    excludedColorCodes,
    mirrorFlip,
    open,
    pixels,
    showAxis,
    showColorCode,
    showGrid,
    showMinorGrid,
    width,
  ]);

  const goToStep = (direction: -1 | 1) => {
    setActiveIndex(() => Math.min(Math.max(clampedActiveIndex + direction, 0), Math.max(steps.length - 1, 0)));
  };

  const markComplete = () => {
    if (!activeStep) return;
    setCompletedColors((current) => {
      const next = new Set(current);
      next.add(activeStep.color);
      return next;
    });
    setActiveIndex(() => Math.min(clampedActiveIndex + 1, Math.max(steps.length - 1, 0)));
  };

  const handleToggleExcludedColor = (color: string) => {
    const key = normalizeHex(color);
    setExcludedColorCodes((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleGridIntervalChange = (value: number[]) => {
    setDraftGridInterval(value);
  };

  const handleGridIntervalCommit = (value: number[]) => {
    const nextValue = value[0] ?? gridInterval;
    setDraftGridInterval([nextValue]);
    setGridInterval(nextValue);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[100dvh] w-screen max-w-none translate-x-[-50%] translate-y-[-50%] gap-0 overflow-hidden rounded-none border-0 bg-background p-0 shadow-none"
        onOpenAutoFocus={() => {
          setActiveIndex(0);
          setCompletedColors(new Set());
          setSettingsOpen(false);
        }}
      >
        <DialogTitle className="sr-only">{t("editor.assembly.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("editor.assembly.description")}</DialogDescription>

        <div className="grid h-full grid-rows-[72px_1fr_70px] bg-slate-50">
          <header className="grid grid-cols-[96px_1fr_96px] items-center border-b bg-background px-5">
            <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-10 justify-self-start rounded-xl",
                    settingsOpen && "bg-amber-400 text-foreground hover:bg-amber-400/90"
                  )}
                >
                  <SlidersHorizontal className="size-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                portalled={false}
                align="start"
                side="bottom"
                sideOffset={14}
                className="w-[308px] gap-0 rounded-2xl border border-border/60 p-0 shadow-xl"
              >
                <div className="space-y-4 p-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Settings</h3>

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

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Color Code</h3>

                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <Label className="text-[11px] font-semibold">{t("editor.exportDialog.showColorCode")}</Label>
                        <div className="text-[10px] text-muted-foreground">
                          {t("editor.assembly.showColorCodeHint")}
                        </div>
                      </div>
                      <Switch
                        checked={showColorCode}
                        onCheckedChange={setShowColorCode}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className={cn("text-[11px] font-semibold", !showColorCode && "text-muted-foreground")}>
                        {t("editor.exportDialog.excludeColors")}
                      </Label>
                      <div className={cn("grid grid-cols-6 gap-2", !showColorCode && "pointer-events-none opacity-50")}>
                        {nearWhiteSwatches.map((swatch) => {
                          const key = normalizeHex(swatch.color);
                          const isSelected = excludedColorCodes.has(key);
                          return (
                            <button
                              key={`${swatch.label}-${key}`}
                              type="button"
                              onClick={() => handleToggleExcludedColor(swatch.color)}
                              className="group relative flex flex-col items-center gap-1 p-0.5 transition-transform hover:scale-105 active:scale-95"
                            >
                              <div
                                className={cn(
                                  "relative flex h-9 w-9 items-center justify-center rounded-md border-2 transition-shadow",
                                  isSelected ? "border-primary" : "border-gray-400/20"
                                )}
                                style={{ backgroundColor: swatch.color }}
                              >
                                <span
                                  className={cn(
                                    "text-[8px] font-bold transition-colors",
                                    isDarkColor(swatch.color) ? "text-white" : "text-black/60"
                                  )}
                                >
                                  {swatch.label}
                                </span>
                                {isSelected && (
                                  <div className="absolute -right-0.5 -top-0.5 flex size-3 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                                    <Check className="size-2" />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
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
                          {draftGridInterval[0]}
                        </span>
                      </div>
                      <Slider
                        value={draftGridInterval}
                        onValueChange={handleGridIntervalChange}
                        onValueCommit={handleGridIntervalCommit}
                        min={1}
                        max={30}
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
                      <div className={cn("grid grid-cols-6 gap-2", !showGrid && "pointer-events-none opacity-50")}>
                        {PATTERN_GRID_COLORS.map((color) => {
                          const selected = color.toLowerCase() === gridColor.toLowerCase();
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setGridColor(color)}
                              className="group relative flex flex-col items-center gap-1 p-0.5 transition-transform hover:scale-105 active:scale-95"
                              aria-label={color}
                            >
                              <div
                                className={cn(
                                  "relative flex h-9 w-9 items-center justify-center rounded-md border-2 transition-shadow",
                                  selected ? "border-primary" : "border-gray-400/20"
                                )}
                                style={{ backgroundColor: color }}
                              >
                                {selected && (
                                  <div className="absolute -right-0.5 -top-0.5 flex size-3 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                                    <Check className="size-2" />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <div className="mx-auto w-full max-w-[608px] space-y-1.5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{t("editor.assembly.progress")}</span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-sky-500 transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="size-10 justify-self-end rounded-full">
                <X className="size-5" />
              </Button>
            </DialogClose>
          </header>

          <main className="relative min-h-0 overflow-hidden">
            {steps.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                {t("editor.assembly.empty")}
              </div>
            ) : (
              <canvas ref={canvasRef} className="block size-full" />
            )}
          </main>

          <footer className="grid grid-cols-[1fr_auto_1fr] items-center border-t bg-background/95 px-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur">
            <Button
              variant="outline"
              size="icon"
              className="size-12 justify-self-end rounded-lg"
              disabled={clampedActiveIndex === 0 || steps.length === 0}
              onClick={() => goToStep(-1)}
            >
              <ChevronLeft className="size-5" />
            </Button>

            <div className="mx-8 flex min-w-0 items-center gap-6">
              <div className="flex min-w-[150px] items-center gap-3">
                <span
                  className="size-10 shrink-0 rounded-full border shadow-sm"
                  style={{ backgroundColor: activeStep?.color ?? "transparent" }}
                />
                <span className="min-w-0">
                  <span className="block text-xl font-bold leading-5 text-foreground">
                    {activeStep?.label ?? "--"}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {activeStep ? t("editor.assembly.beadCount", { count: activeStep.count }) : t("editor.assembly.noStep")}
                  </span>
                </span>
              </div>

              <Button
                className={cn(
                  "h-11 min-w-[202px] rounded-md bg-pink-600 px-5 text-base font-semibold text-white shadow-sm hover:bg-pink-600/90",
                  activeStep && completedColors.has(activeStep.color) && "bg-emerald-600 hover:bg-emerald-600/90"
                )}
                disabled={!activeStep}
                onClick={markComplete}
              >
                <Check className="size-5" />
                {activeStep && completedColors.has(activeStep.color)
                  ? t("editor.assembly.completed")
                  : t("editor.assembly.markComplete")}
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="size-12 justify-self-start rounded-lg"
              disabled={clampedActiveIndex >= steps.length - 1 || steps.length === 0}
              onClick={() => goToStep(1)}
            >
              <ChevronRight className="size-5" />
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
