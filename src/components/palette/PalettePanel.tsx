import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  Palette, 
  Settings, 
  Grid, 
  History, 
  Shapes,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditorStore } from "@/store/useEditorStore";
import { usePaletteStore } from "@/store/usePaletteStore";
import PaletteManageDialog from "@/components/palette/PaletteManageDialog";
import { getSystemPalette, type PaletteSwatch } from "@/lib/palettes";
import { cn } from "@/lib/utils";

type TabId = "used" | "recent" | "all" | "custom";

function normalizeHex(hex: string) {
  return hex.trim().toUpperCase();
}

function hexLabel(hex: string) {
  const v = normalizeHex(hex);
  return v.startsWith("#") ? v.slice(1) : v;
}

function getLabelFromColor(hex: string, paletteSwatches: PaletteSwatch[]): string {
  const normalizedHex = normalizeHex(hex);
  const found = paletteSwatches.find((s) => normalizeHex(s.color) === normalizedHex);
  return found?.label ?? hexLabel(hex);
}

function isDarkColor(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

export default function PalettePanel() {
  const { t } = useTranslation();
  const { primaryColor, setColor } = useEditorStore();
  const { currentPaletteId, recentColors, usedColors, customPalette, setCustomPalette } = usePaletteStore();
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("all");

  const palette = getSystemPalette(currentPaletteId)!;

  const visibleSwatches = useMemo((): PaletteSwatch[] => {
    if (tab === "all") return palette.swatches;
    if (tab === "used") return usedColors.map((c) => ({ label: getLabelFromColor(c, palette.swatches), color: c }));
    if (tab === "custom") return customPalette.map((c) => ({ label: getLabelFromColor(c, palette.swatches), color: c }));
    return recentColors.map((c) => ({ label: getLabelFromColor(c, palette.swatches), color: c }));
  }, [palette.swatches, recentColors, usedColors, customPalette, tab]);

  return (
    <div className="h-full bg-background flex flex-col gap-4 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between shrink-0 pl-4 pr-4 pt-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Palette size={16} />
            <span>{t("palette.palette")}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={() => setIsManageOpen(true)}
          >
            <Settings size={14} />
            <span className="text-xs">{t("palette.manage")}</span>
          </Button>
          <div className="bg-pink-100 text-pink-500 text-[10px] font-bold px-2 py-0.5 rounded border border-pink-200 uppercase tracking-wider">
            {palette.i18nKey ? t(palette.i18nKey) : palette.name}
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="w-auto">
          <TabsList className="h-8 bg-muted/50 p-1">
            <TabsTrigger value="used" className="text-[10px] h-6 px-3 gap-1">
              <Grid size={12} />
              {t("palette.usedColors")}
            </TabsTrigger>
            <TabsTrigger value="recent" className="text-[10px] h-6 px-3 gap-1">
              <History size={12} />
              {t("palette.recent")}
            </TabsTrigger>
            <TabsTrigger value="all" className="text-[10px] h-6 px-3 gap-1">
              <Shapes size={12} />
              {t("palette.allColors")}
            </TabsTrigger>
            {customPalette.length > 0 && (
              <TabsTrigger value="custom" className="text-[10px] h-6 px-3 gap-1">
                <Star size={12} />
                {t("palette.custom")}
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-3 py-1">
          {visibleSwatches.map((swatch, i) => (
            <div key={i} className="flex flex-col items-center gap-1 p-1 transition-transform hover:scale-105 active:scale-95">
              <button
                className={cn(
                  "w-12 h-12 rounded-md shadow-sm relative flex items-center justify-center",
                  primaryColor === swatch.color ? "ring-2 ring-pink-500" : ""
                )}
                style={{ backgroundColor: swatch.color }}
                onClick={() => setColor(swatch.color)}
              >
                <span className={cn(
                  "text-[10px] font-bold transition-colors",
                  isDarkColor(swatch.color) ? "text-white" : "text-black/70"
                )}>
                  {swatch.label}
                </span>
                {primaryColor === swatch.color && (
                  <div className="absolute -top-1 -right-1 size-4 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
        onConfirm={(selectedColors) => {
          setCustomPalette(selectedColors);
          setTab("custom");
        }}
      />
    </div>
  );
}
