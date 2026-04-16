import { useEffect, useMemo, useRef, useState } from "react";
import type { PaletteTabId } from "@/store/usePaletteStore";
import { useTranslation } from "react-i18next";
import {
  Palette,
  Settings,
  Grid,
  History,
  Shapes,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditorStore } from "@/store/useEditorStore";
import { usePaletteStore } from "@/store/usePaletteStore";
import PaletteManageDialog from "@/components/palette/PaletteManageDialog";
import { getSystemPalette, type PaletteSwatch } from "@/lib/palettes";
import { cn, normalizeHex, hexLabel, isDarkColor } from "@/lib/utils";

function getLabelFromColor(hex: string, paletteSwatches: PaletteSwatch[]): string {
  const normalizedHex = normalizeHex(hex);
  const found = paletteSwatches.find((s) => normalizeHex(s.color) === normalizedHex);
  return found?.label ?? hexLabel(hex);
}

export default function PalettePanel() {
  const { t } = useTranslation();
  const { primaryColor, setColor } = useEditorStore();
  const committedPixels = useEditorStore((s) => s.history[s.historyIndex]?.pixels ?? s.pixels);
  const { currentPaletteId, recentColors, setCurrentPaletteId, activeTab: tab, setActiveTab: setTab, usedTabFlashAt } = usePaletteStore();
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isUsedFlashing, setIsUsedFlashing] = useState(false);

  useEffect(() => {
    if (!usedTabFlashAt) return;
    setIsUsedFlashing(true);
    const timer = setTimeout(() => setIsUsedFlashing(false), 900);
    return () => clearTimeout(timer);
  }, [usedTabFlashAt]);

  const palette = getSystemPalette(currentPaletteId)!;

  const usedOrderRef = useRef<string[]>([]);
  const { canvasUsedColors, usedCounts } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const color of Object.values(committedPixels)) {
      const key = `#${normalizeHex(color)}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const prev = usedOrderRef.current;
    const kept = prev.filter((c) => counts.has(c));
    const keptSet = new Set(kept);
    for (const c of counts.keys()) {
      if (!keptSet.has(c)) kept.push(c);
    }
    usedOrderRef.current = kept;
    return { canvasUsedColors: kept, usedCounts: counts };
  }, [committedPixels]);

  const visibleSwatches = useMemo((): PaletteSwatch[] => {
    if (tab === "all") return palette.swatches;
    if (tab === "used") return canvasUsedColors.map((c) => ({ label: getLabelFromColor(c, palette.swatches), color: c }));
    return recentColors.map((c) => ({ label: getLabelFromColor(c, palette.swatches), color: c }));
  }, [palette.swatches, recentColors, canvasUsedColors, tab]);

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
          <div className="bg-primary/10 dark:bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary/20 uppercase tracking-wider shrink-0">
            {palette.i18nKey ? t(palette.i18nKey) : palette.name}
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as PaletteTabId)}>
          <TabsList className="h-8 bg-muted/50 p-1">
            <TabsTrigger
              value="used"
              className={cn(
                "text-[10px] h-6 px-2 sm:px-3 gap-1 cursor-pointer transition-all",
                isUsedFlashing && "ring-2 ring-primary ring-offset-1 ring-offset-background scale-110"
              )}
            >
              <Grid size={12} />
              <span className="hidden sm:inline">{t("palette.usedColors")}</span>
            </TabsTrigger>
            <TabsTrigger value="recent" className="text-[10px] h-6 px-2 sm:px-3 gap-1 cursor-pointer">
              <History size={12} />
              <span className="hidden sm:inline">{t("palette.recent")}</span>
            </TabsTrigger>
            <TabsTrigger value="all" className="text-[10px] h-6 px-2 sm:px-3 gap-1 cursor-pointer">
              <Shapes size={12} />
              <span className="hidden sm:inline">{t("palette.allColors")}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 mt-1">
        <div
          key={tab}
          className="grid grid-cols-7 gap-2 sm:gap-3 py-1 sm:[grid-template-columns:repeat(auto-fill,minmax(52px,1fr))] animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
        >
          {visibleSwatches.map((swatch, i) => (
            <div key={i} className="flex flex-col items-center gap-1 p-0.5 sm:p-1 transition-transform hover:scale-105 active:scale-95">
              <button
                className={cn(
                  "w-full aspect-square rounded-md shadow-sm relative flex items-center justify-center",
                  primaryColor === swatch.color ? "ring-2 ring-primary" : ""
                )}
                style={{ backgroundColor: swatch.color }}
                onClick={() => setColor(swatch.color)}
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
          ))}
        </div>
      </div>

      <PaletteManageDialog
        open={isManageOpen}
        onOpenChange={setIsManageOpen}
        onPaletteChange={(paletteId) => {
          setCurrentPaletteId(paletteId);
        }}
        onConfirm={() => {
          setTab("all");
        }}
      />
    </div>
  );
}
