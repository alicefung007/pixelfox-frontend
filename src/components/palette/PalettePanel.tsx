import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  Palette, 
  Settings, 
  Grid, 
  History, 
  Shapes
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditorStore } from "@/store/useEditorStore";
import { usePaletteStore } from "@/store/usePaletteStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import PaletteManageDialog from "@/components/palette/PaletteManageDialog";
import { MARD_PALETTE, type PaletteSwatch } from "@/lib/palettes";

type TabId = "used" | "recent" | "all";

function normalizeHex(hex: string) {
  return hex.trim().toUpperCase();
}

function hexLabel(hex: string) {
  const v = normalizeHex(hex);
  return v.startsWith("#") ? v.slice(1) : v;
}

export default function PalettePanel() {
  const { t } = useTranslation();
  const { primaryColor, setColor } = useEditorStore();
  const { recentColors, usedColors } = usePaletteStore();
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("all");

  const palette = MARD_PALETTE;

  const visibleSwatches = useMemo((): PaletteSwatch[] => {
    if (tab === "all") return palette.swatches;
    if (tab === "used") return usedColors.map((c) => ({ label: hexLabel(c), color: c }));
    return recentColors.map((c) => ({ label: hexLabel(c), color: c }));
  }, [palette.swatches, recentColors, tab, usedColors]);

  return (
    <div className="h-full bg-background flex flex-col p-4 gap-4 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between shrink-0">
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
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-3 p-1">
          {visibleSwatches.map((swatch, i) => (
            <div key={i} className="flex flex-col items-center gap-1 group p-1">
              <button
                className={`w-12 h-12 rounded-md shadow-sm transition-transform hover:scale-105 active:scale-95 relative ${
                  primaryColor === swatch.color ? "ring-2 ring-pink-500 ring-offset-2" : ""
                }`}
                style={{ backgroundColor: swatch.color }}
                onClick={() => setColor(swatch.color)}
              >
                {primaryColor === swatch.color && (
                  <div className="absolute inset-0 rounded-md border-2 border-pink-500/50" />
                )}
              </button>
              <span className="text-[10px] text-muted-foreground font-medium group-hover:text-foreground transition-colors">
                {swatch.label}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>

      <PaletteManageDialog
        open={isManageOpen}
        onOpenChange={setIsManageOpen}
      />
    </div>
  );
}
