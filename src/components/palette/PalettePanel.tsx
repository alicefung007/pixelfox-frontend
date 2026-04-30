import { useEffect, useMemo, useRef, useState } from "react";
import type { PaletteTabId } from "@/store/usePaletteStore";
import { useTranslation } from "react-i18next";
import {
  Flower,
  Palette,
  Settings,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useEditorStore } from "@/store/useEditorStore";
import { usePaletteStore } from "@/store/usePaletteStore";
import UsedColorActionButtons from "@/components/palette/UsedColorActionButtons";
import PaletteManageDialog from "@/components/palette/PaletteManageDialog";
import { getSystemPalette, type PaletteSwatch, type SystemPaletteId } from "@/lib/palettes";
import { resolvePaletteColor } from "@/lib/palette-color";
import { showPaletteRemapToast } from "@/lib/palette-notice";
import { cn, normalizeHex, hexLabel, isDarkColor } from "@/lib/utils";

type PalettePanelProps = {
  onOpenReplaceColorDialog: (sourceColor: string) => void;
};

export default function PalettePanel({ onOpenReplaceColorDialog }: PalettePanelProps) {
  const { t } = useTranslation();
  const primaryColor = useEditorStore((state) => state.primaryColor);
  const setColor = useEditorStore((state) => state.setColor);
  const clear = useEditorStore((state) => state.clear);
  const setPixels = useEditorStore((state) => state.setPixels);
  const saveHistory = useEditorStore((state) => state.saveHistory);
  const committedPixels = useEditorStore((s) => s.history[s.historyIndex]?.pixels ?? s.pixels);
  const currentPaletteId = usePaletteStore((state) => state.currentPaletteId);
  const setCurrentPaletteId = usePaletteStore((state) => state.setCurrentPaletteId);
  const tab = usePaletteStore((state) => state.activeTab);
  const setTab = usePaletteStore((state) => state.setActiveTab);
  const selectedUsedColor = usePaletteStore((state) => state.selectedUsedColor);
  const setSelectedUsedColor = usePaletteStore((state) => state.setSelectedUsedColor);
  const usedTabFlashAt = usePaletteStore((state) => state.usedTabFlashAt);
  const handledUsedTabFlashAtRef = useRef(usedTabFlashAt);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isUsedFlashing, setIsUsedFlashing] = useState(false);
  const [pendingPaletteId, setPendingPaletteId] = useState<SystemPaletteId | null>(null);
  const [usedActionPopoverColor, setUsedActionPopoverColor] = useState<string | null>(null);

  useEffect(() => {
    if (!usedTabFlashAt || handledUsedTabFlashAtRef.current === usedTabFlashAt) return;
    handledUsedTabFlashAtRef.current = usedTabFlashAt;
    queueMicrotask(() => setIsUsedFlashing(true));
    const timer = setTimeout(() => setIsUsedFlashing(false), 900);
    return () => clearTimeout(timer);
  }, [usedTabFlashAt]);

  useEffect(() => {
    if (tab === "recent") {
      setTab("all");
    }
  }, [tab, setTab]);

  const palette = getSystemPalette(currentPaletteId)!;
  const paletteLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const swatch of palette.swatches) {
      map.set(normalizeHex(swatch.color), swatch.label);
    }
    return map;
  }, [palette.swatches]);

  const { canvasUsedColors, usedCounts } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const color of Object.values(committedPixels)) {
      const key = `#${normalizeHex(color)}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return { canvasUsedColors: Array.from(counts.keys()), usedCounts: counts };
  }, [committedPixels]);

  const visibleSwatches = useMemo((): PaletteSwatch[] => {
    if (tab === "all") return palette.swatches;
    return canvasUsedColors.map((color) => ({
      label: paletteLabelMap.get(normalizeHex(color)) ?? hexLabel(color),
      color,
    }));
  }, [palette.swatches, canvasUsedColors, paletteLabelMap, tab]);

  const getLabelFromColor = (hex: string) => {
    const normalizedHex = normalizeHex(hex);
    return paletteLabelMap.get(normalizedHex) ?? hexLabel(hex);
  };

  const pendingPalette = useMemo(
    () => (pendingPaletteId ? getSystemPalette(pendingPaletteId) : null),
    [pendingPaletteId]
  );
  const pendingIncompatibleColors = useMemo(() => {
    if (!pendingPalette) return [];
    const targetColors = new Set(
      pendingPalette.swatches.map((swatch) => normalizeHex(swatch.color))
    );
    return canvasUsedColors.filter((color) => !targetColors.has(normalizeHex(color)));
  }, [canvasUsedColors, pendingPalette]);
  const visiblePendingIncompatibleColors = useMemo(
    () =>
      pendingIncompatibleColors.length > 8
        ? pendingIncompatibleColors.slice(0, 7)
        : pendingIncompatibleColors,
    [pendingIncompatibleColors]
  );

  useEffect(() => {
    if (!selectedUsedColor) return;
    const hasSelection = canvasUsedColors.some(
      (color) => normalizeHex(color) === normalizeHex(selectedUsedColor)
    );
    if (!hasSelection) {
      queueMicrotask(() => {
        setSelectedUsedColor(null);
        setUsedActionPopoverColor(null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasUsedColors, selectedUsedColor]);

  useEffect(() => {
    if (selectedUsedColor || !usedActionPopoverColor) return;
    queueMicrotask(() => setUsedActionPopoverColor(null));
  }, [selectedUsedColor, usedActionPopoverColor]);

  useEffect(() => {
    if (tab !== "used" || !selectedUsedColor) return;
    const normalizedSelectedColor = normalizeHex(selectedUsedColor);
    const hasSelection = canvasUsedColors.some(
      (color) => normalizeHex(color) === normalizedSelectedColor
    );
    if (!hasSelection || usedActionPopoverColor === normalizedSelectedColor) return;
    queueMicrotask(() => setUsedActionPopoverColor(normalizedSelectedColor));
  }, [canvasUsedColors, selectedUsedColor, tab, usedActionPopoverColor]);

  useEffect(() => {
    if (tab !== "used") {
      queueMicrotask(() => setUsedActionPopoverColor(null));
    }
  }, [tab]);

  useEffect(() => {
    const resolvedPrimaryColor = resolvePaletteColor(primaryColor, palette);
    if (normalizeHex(resolvedPrimaryColor) === normalizeHex(primaryColor)) return;
    setColor(resolvedPrimaryColor);
    showPaletteRemapToast({
      fromColor: primaryColor,
      toColor: resolvedPrimaryColor,
      palette,
      t,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette, primaryColor, setColor]);

  const handleClearSelectedColor = () => {
    if (!selectedUsedColor) return;

    const selectedColor = normalizeHex(selectedUsedColor);
    let changed = false;
    const currentPixels = useEditorStore.getState().pixels;
    const nextPixels: Record<string, string> = {};

    for (const [key, color] of Object.entries(currentPixels)) {
      if (normalizeHex(color) === selectedColor) {
        changed = true;
        continue;
      }
      nextPixels[key] = color;
    }

    if (!changed) return;

    setPixels(nextPixels);
    saveHistory();
    setSelectedUsedColor(null);
    setUsedActionPopoverColor(null);
  };

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden shadow-sm">
      <div className="flex items-center justify-between gap-2 shrink-0 px-3 sm:px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <Palette size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground hidden sm:inline">{t("palette.palette")}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={() => setIsManageOpen(true)}
          >
            <Settings size={14} />
            <span className="text-xs">{t("palette.manage")}</span>
          </Button>
          <div className="bg-primary/10 dark:bg-primary/20 text-primary px-2 py-1 rounded-md border border-primary/20 shrink-0 flex flex-col items-center gap-0.5">
            <span className="text-[11px] font-semibold leading-none">
              {palette.i18nKey ? t(palette.i18nKey) : palette.name}
            </span>
            <span className="text-[9px] text-primary/60 leading-none">Current Palette</span>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as PaletteTabId)}>
          <TabsList className="h-auto gap-0 rounded-lg border bg-background/95 p-0.5 shadow-sm backdrop-blur-sm">
            <TabsTrigger
              value="used"
              className={cn(
                "h-7 flex-none cursor-pointer gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-all hover:bg-accent/70 hover:text-foreground data-active:bg-background data-active:text-foreground data-active:shadow-xs",
                isUsedFlashing && "ring-2 ring-primary ring-offset-1 ring-offset-background scale-110"
              )}
            >
              <Flower className="size-3.5" />
              <span className="hidden sm:inline">{t("palette.usedColors")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="h-7 flex-none cursor-pointer gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-all hover:bg-accent/70 hover:text-foreground data-active:bg-background data-active:text-foreground data-active:shadow-xs"
            >
              <Palette className="size-3.5" />
              <span className="hidden sm:inline">{t("palette.allColors")}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 mt-1">
        <div
          key={tab}
          className="grid grid-cols-7 gap-2 sm:gap-3 py-1 sm:[grid-template-columns:repeat(auto-fill,minmax(52px,1fr))]"
        >
          {visibleSwatches.map((swatch, i) => {
            const normalizedSwatch = normalizeHex(swatch.color);
            const isSelectedUsedColor =
              tab === "used" &&
              selectedUsedColor &&
              normalizeHex(selectedUsedColor) === normalizedSwatch;
            const isUsedActionPopoverOpen =
              tab === "used" && usedActionPopoverColor === normalizedSwatch;

            return (
            <div key={i} className="relative flex flex-col items-center gap-1 p-0.5 sm:p-1">
              <Popover
                open={isUsedActionPopoverOpen}
                onOpenChange={(open) => {
                  if (open) {
                    setUsedActionPopoverColor(normalizedSwatch);
                    return;
                  }
                  setUsedActionPopoverColor(null);
                  if (isSelectedUsedColor) {
                    setSelectedUsedColor(null);
                  }
                }}
              >
                <PopoverAnchor asChild>
                  <div className="w-full">
                  <button
                    type="button"
                    className={cn(
                      "w-full aspect-square rounded-md border-2 relative flex items-center justify-center transition-transform hover:scale-105 active:scale-95",
                      isSelectedUsedColor
                        ? "border-primary ring-2 ring-primary/25"
                        : primaryColor === swatch.color
                          ? "border-primary"
                          : "border-gray-400/20"
                    )}
                    style={{ backgroundColor: swatch.color }}
                    onClick={() => {
                      setColor(swatch.color);
                      if (tab === "used") {
                        const isSameSelection =
                          selectedUsedColor && normalizeHex(selectedUsedColor) === normalizedSwatch;

                        if (isSameSelection) {
                          if (isUsedActionPopoverOpen) {
                            setSelectedUsedColor(null);
                            setUsedActionPopoverColor(null);
                          } else {
                            setUsedActionPopoverColor(normalizedSwatch);
                          }
                          return;
                        }

                        setSelectedUsedColor(normalizedSwatch);
                        setUsedActionPopoverColor(normalizedSwatch);
                        return;
                      }
                      if (selectedUsedColor) {
                        setSelectedUsedColor(null);
                      }
                      setUsedActionPopoverColor(null);
                    }}
                  >
                    <span className={cn(
                      "text-[8px] sm:text-[9px] md:text-[10px] font-bold transition-colors",
                      isDarkColor(swatch.color) ? "text-white" : "text-black/60"
                    )}>
                      {swatch.label}
                    </span>
                    {primaryColor === swatch.color && (
                      <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 size-3 sm:size-4 rounded-full bg-primary text-white flex items-center justify-center shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                    {tab === "used" && (
                      <span className="absolute -bottom-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-foreground/80 text-background text-[9px] font-semibold leading-none flex items-center justify-center shadow-sm tabular-nums">
                        {usedCounts.get(swatch.color) ?? 0}
                      </span>
                    )}
                  </button>
                  </div>
                </PopoverAnchor>
                <PopoverContent
                  side="top"
                  align="end"
                  sideOffset={8}
                  className="z-[100] flex w-fit flex-row items-center gap-0 rounded-lg border bg-background/95 p-0.5 shadow-sm backdrop-blur-sm"
                  onOpenAutoFocus={(event) => event.preventDefault()}
                >
                  <UsedColorActionButtons
                    selectedColor={selectedUsedColor}
                    onReplace={onOpenReplaceColorDialog}
                    onClear={handleClearSelectedColor}
                    onClose={() => setUsedActionPopoverColor(null)}
                  />
                </PopoverContent>
              </Popover>
            </div>
            );
          })}
        </div>
      </div>

      <PaletteManageDialog
        open={isManageOpen}
        onOpenChange={setIsManageOpen}
        onPaletteChange={(paletteId) => {
          if (paletteId === currentPaletteId) return true;
          const targetPalette = getSystemPalette(paletteId);
          const targetColors = new Set(
            (targetPalette?.swatches ?? []).map((swatch) => normalizeHex(swatch.color))
          );
          const hasIncompatibleUsedColors = canvasUsedColors.some(
            (color) => !targetColors.has(normalizeHex(color))
          );
          if (hasIncompatibleUsedColors) {
            setPendingPaletteId(paletteId);
            return false;
          }
          if (targetPalette) {
            const resolvedColor = resolvePaletteColor(primaryColor, targetPalette);
            setColor(resolvedColor);
            showPaletteRemapToast({
              fromColor: primaryColor,
              toColor: resolvedColor,
              palette: targetPalette,
              t,
            });
          }
          setCurrentPaletteId(paletteId);
          return true;
        }}
        onConfirm={() => {
          setTab("all");
        }}
      />

      <Dialog open={Boolean(pendingPaletteId)} onOpenChange={(open) => {
        if (!open) setPendingPaletteId(null);
      }}>
        <DialogContent className="max-w-md rounded-2xl border-border/60 p-0 overflow-hidden">
          <DialogHeader className="gap-3 px-6 pt-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <TriangleAlert className="size-5" />
              </span>
              <div className="space-y-1">
                <DialogTitle>{t("palette.changeConfirmTitle")}</DialogTitle>
                <DialogDescription>
                  {t("palette.changeConfirmDescription", {
                    count: pendingIncompatibleColors.length,
                    palette: pendingPalette?.i18nKey
                      ? t(pendingPalette.i18nKey)
                      : pendingPalette?.name ?? "",
                  })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-4">
            {pendingIncompatibleColors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {visiblePendingIncompatibleColors.map((color) => (
                  <span
                    key={color}
                    className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs text-foreground shadow-sm"
                  >
                    <span
                      className="size-3 rounded-full border border-black/10"
                      style={{ backgroundColor: color }}
                    />
                    <span>
                      {(palette.i18nKey ? t(palette.i18nKey) : palette.name)}
                      {"("}
                      {getLabelFromColor(color)}
                      {")"}
                    </span>
                  </span>
                ))}
                {pendingIncompatibleColors.length > 8 && (
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs text-muted-foreground shadow-sm">
                    {t("palette.changeConfirmMore", {
                      count: pendingIncompatibleColors.length - visiblePendingIncompatibleColors.length,
                    })}
                  </span>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border/60 bg-muted/20 px-6 py-4">
            <Button
              variant="outline"
              className="h-auto min-h-9 px-4 py-2"
              onClick={() => setPendingPaletteId(null)}
            >
              {t("palette.changeConfirmCancel")}
            </Button>
            <Button
              variant="destructive"
              className="h-auto min-h-9 flex-col gap-0.5 px-4 py-2 leading-tight"
              onClick={() => {
                if (!pendingPaletteId) return;
                clear();
                if (pendingPalette) {
                  const resolvedColor = resolvePaletteColor(primaryColor, pendingPalette);
                  setColor(resolvedColor);
                  showPaletteRemapToast({
                    fromColor: primaryColor,
                    toColor: resolvedColor,
                    palette: pendingPalette,
                    t,
                  });
                }
                setCurrentPaletteId(pendingPaletteId);
                setPendingPaletteId(null);
                setSelectedUsedColor(null);
                setTab("all");
                setIsManageOpen(false);
              }}
            >
              <span>{t("palette.changeConfirmContinue")}</span>
              <span className="text-[11px] opacity-90">
                {t("palette.changeConfirmContinueHint")}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
