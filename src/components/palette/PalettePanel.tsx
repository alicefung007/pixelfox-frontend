import { useTranslation } from "react-i18next";
import { 
  Palette, 
  Settings, 
  Grid, 
  History, 
  Shapes
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEditorStore } from "@/store/useEditorStore";
import { usePaletteStore } from "@/store/usePaletteStore";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PalettePanel() {
  const { t } = useTranslation();
  const { primaryColor, setColor } = useEditorStore();
  const { recentColors, usedColors } = usePaletteStore();

  const colorSwatches = [
    { label: "A4", color: "#FFFF00" },
    { label: "A6", color: "#FFC107" },
    { label: "A7", color: "#FF9800" },
    { label: "A10", color: "#FF5722" },
    { label: "A11", color: "#FFE0B2" },
    { label: "A13", color: "#FFCC80" },
    { label: "B3", color: "#8BC34A" },
    { label: "B5", color: "#4CAF50" },
    { label: "B8", color: "#2E7D32" },
    { label: "B12", color: "#1B5E20" },
    { label: "C2", color: "#E0F7FA" },
    { label: "C3", color: "#B2EBF2" },
    { label: "C5", color: "#4DD0E1" },
    { label: "C6", color: "#26C6DA" },
    { label: "C7", color: "#00BCD4" },
    { label: "C8", color: "#0097A7" },
    { label: "C10", color: "#4FC3F7" },
    { label: "C11", color: "#03A9F4" },
    { label: "C13", color: "#0288D1" },
    { label: "D3", color: "#3F51B5" },
  ];

  const renderColorGrid = (colors: { label?: string; color: string }[]) => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-3">
      {colors.map((swatch, i) => (
        <div key={`${swatch.color}-${i}`} className="flex flex-col items-center gap-1 group">
          <button
            className={`w-12 h-10 rounded-md shadow-sm transition-transform hover:scale-105 active:scale-95 relative ${
              primaryColor === swatch.color ? "ring-2 ring-pink-500 ring-offset-2" : ""
            }`}
            style={{ backgroundColor: swatch.color }}
            onClick={() => setColor(swatch.color)}
          >
            {primaryColor === swatch.color && (
              <div className="absolute inset-0 rounded-md border-2 border-pink-500/50" />
            )}
          </button>
          {swatch.label ? (
            <span className="text-[10px] text-muted-foreground font-medium group-hover:text-foreground transition-colors">
              {swatch.label}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );

  return (
    <Tabs defaultValue="all" className="h-full bg-background flex flex-col p-4 gap-4 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Palette size={16} />
            <span>{t("palette.palette")}</span>
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-2">
            <Settings size={14} />
            <span className="text-xs">{t("palette.manage")}</span>
          </Button>
          <div className="bg-pink-100 text-pink-500 text-[10px] font-bold px-2 py-0.5 rounded border border-pink-200 uppercase tracking-wider">
            {t("palette.mard")}
          </div>
        </div>

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
      </div>

      <TabsContent value="used" className="flex-1">
        <ScrollArea className="h-full">
          {renderColorGrid(usedColors.map((color) => ({ color })))}
        </ScrollArea>
      </TabsContent>
      <TabsContent value="recent" className="flex-1">
        <ScrollArea className="h-full">
          {renderColorGrid(recentColors.map((color) => ({ color })))}
        </ScrollArea>
      </TabsContent>
      <TabsContent value="all" className="flex-1">
        <ScrollArea className="h-full">{renderColorGrid(colorSwatches)}</ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
