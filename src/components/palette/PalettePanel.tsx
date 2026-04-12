import { useMemo, useState } from "react";
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

type TabId = "used" | "recent" | "all";

function getLabelFromColor(hex: string, paletteSwatches: PaletteSwatch[]): string {
  const normalizedHex = normalizeHex(hex);
  const found = paletteSwatches.find((s) => normalizeHex(s.color) === normalizedHex);
  return found?.label ?? hexLabel(hex);
}

export default function PalettePanel() {
  const { t } = useTranslation();
  const { primaryColor, setColor } = useEditorStore();
  const { currentPaletteId, recentColors, usedColors, setCurrentPaletteId } = usePaletteStore();
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("all");

  const palette = getSystemPalette(currentPaletteId)!;

  const visibleSwatches = useMemo((): PaletteSwatch[] => {
    if (tab === "all") return palette.swatches;
    if (tab === "used") return usedColors.map((c) => ({ label: getLabelFromColor(c, palette.swatches), color: c }));
    return recentColors.map((c) => ({ label: getLabelFromColor(c, palette.swatches), color: c }));
  }, [palette.swatches, recentColors, usedColors, tab]);

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
          <div className="bg-pink-100 dark:bg-pink-900/30 text-pink-500 text-[10px] font-bold px-2 py-0.5 rounded border border-pink-200 dark:border-pink-800 uppercase tracking-wider shrink-0">
            {palette.i18nKey ? t(palette.i18nKey) : palette.name}
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
          <TabsList className="h-8 bg-muted/50 p-1">
            <TabsTrigger value="used" className="text-[10px] h-6 px-2 sm:px-3 gap-1">
              <Grid size={12} />
              <span className="hidden sm:inline">{t("palette.usedColors")}</span>
            </TabsTrigger>
            <TabsTrigger value="recent" className="text-[10px] h-6 px-2 sm:px-3 gap-1">
              <History size={12} />
              <span className="hidden sm:inline">{t("palette.recent")}</span>
            </TabsTrigger>
            <TabsTrigger value="all" className="text-[10px] h-6 px-2 sm:px-3 gap-1">
              <Shapes size={12} />
              <span className="hidden sm:inline">{t("palette.allColors")}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 mt-1">
        <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-2 sm:gap-3 py-1">
          {visibleSwatches.map((swatch, i) => (
            <div key={i} className="flex flex-col items-center gap-1 p-0.5 sm:p-1 transition-transform hover:scale-105 active:scale-95">
              <button
                className={cn(
                  "w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-md shadow-sm relative flex items-center justify-center",
                  primaryColor === swatch.color ? "ring-2 ring-pink-500" : ""
                )}
                style={{ backgroundColor: swatch.color }}
                onClick={() => setColor(swatch.color)}
              >
                <span className={cn(
                  "text-[8px] sm:text-[9px] md:text-[10px] font-bold transition-colors",
                  isDarkColor(swatch.color) ? "text-white" : "text-black/70"
                )}>
                  {swatch.label}
                </span>
                {primaryColor === swatch.color && (
                  <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 size-3 sm:size-4 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
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
