import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Sparkles, ZoomIn, Link, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { clamp } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function UploadPhotoDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  
  // Pattern size beads (1-200)
  const [widthBeads, setWidthBeads] = useState("50");
  const [heightBeads, setHeightBeads] = useState("50");
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true);

  // Offset values (-200 to 200)
  const [offsetX, setOffsetX] = useState("0");
  const [offsetY, setOffsetY] = useState("0");

  // Extraction settings
  const [extractionQuality, setExtractionQuality] = useState("recommended");
  const [colorPalette, setColorPalette] = useState("current");
  const [colorMerging, setColorMerging] = useState(true);
  const [colorMergeThreshold, setColorMergeThreshold] = useState([10]);

  // Clamp beads value between 1-200
  const clampBeads = (val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) return "";
    return String(clamp(num, 1, 200));
  };

  // Clamp offset value between -200 to 200 (integers only)
  const clampOffset = (val: string) => {
    if (val === "" || val === "-") return val;
    const num = parseInt(val, 10);
    if (isNaN(num)) return "";
    return String(clamp(num, -200, 200));
  };

  // Aspect ratio handling (locked by width)
  const handleWidthBeadsChange = (val: string) => {
    const clamped = clampBeads(val);
    setWidthBeads(clamped);
    if (aspectRatioLocked && clamped !== "") {
      const newWidth = parseInt(clamped, 10);
      const currentHeight = parseInt(heightBeads, 10) || 1;
      const currentWidth = parseInt(widthBeads, 10) || 1;
      if (currentWidth > 0) {
        const ratio = currentHeight / currentWidth;
        const newHeight = Math.round(newWidth * ratio);
        setHeightBeads(String(clamp(newHeight, 1, 200)));
      }
    }
  };

  const handleHeightBeadsChange = (val: string) => {
    const clamped = clampBeads(val);
    setHeightBeads(clamped);
    if (aspectRatioLocked && clamped !== "") {
      const newHeight = parseInt(clamped, 10);
      const currentHeight = parseInt(heightBeads, 10) || 1;
      const currentWidth = parseInt(widthBeads, 10) || 1;
      if (currentHeight > 0) {
        const ratio = currentWidth / currentHeight;
        const newWidth = Math.round(newHeight * ratio);
        setWidthBeads(String(clamp(newWidth, 1, 200)));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[980px] w-[calc(100vw-32px)] md:w-full p-0 flex flex-col gap-0 max-h-[90vh]">
        <DialogHeader className="px-3 pt-3 pb-2 md:px-6 md:pt-6 md:pb-4 shrink-0 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle>{t("editor.uploadDialog.title")}</DialogTitle>
              <DialogDescription>{t("editor.uploadDialog.description")}</DialogDescription>
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
            <div className="space-y-2 pt-3">
              <Label className="text-xs font-semibold">{t("editor.uploadDialog.uploadPhoto")}</Label>
              <Input type="file" className="text-base" />
            </div>

            <Card className="rounded-xl py-4 gap-4 shadow-none bg-muted/20">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">{t("editor.uploadDialog.gridSettings")}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold">
                      {t("editor.uploadDialog.patternSizeBeads")}
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={aspectRatioLocked ? "secondary" : "ghost"}
                          size="icon-xs"
                          className={aspectRatioLocked ? "" : "text-muted-foreground"}
                          onClick={() => {
                            if (!aspectRatioLocked) {
                              setHeightBeads(widthBeads);
                            }
                            setAspectRatioLocked(!aspectRatioLocked);
                          }}
                        >
                          {aspectRatioLocked ? (
                            <Link className="size-3.5" />
                          ) : (
                            <Unlink className="size-3.5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {aspectRatioLocked
                          ? t("editor.uploadDialog.lockAspectRatio")
                          : t("editor.uploadDialog.unlockAspectRatio")}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        {t("editor.uploadDialog.widthBeads")}
                      </Label>
                      <Input
                        value={widthBeads}
                        onChange={(e) => handleWidthBeadsChange(e.target.value)}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        {t("editor.uploadDialog.heightBeads")}
                      </Label>
                      <Input
                        value={heightBeads}
                        onChange={(e) => handleHeightBeadsChange(e.target.value)}
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="space-y-1 py-2">
                      <Label className="text-[10px] text-muted-foreground">
                        {t("editor.uploadDialog.widthBeads")}
                      </Label>
                      <Slider
                        value={[Number(widthBeads) || 1]}
                        onValueChange={([val]) => handleWidthBeadsChange(String(val))}
                        min={1}
                        max={200}
                        className="[&_[data-slot=slider-range]]:bg-pink-500"
                      />
                    </div>
                    <div className="space-y-1 py-2">
                      <Label className="text-[10px] text-muted-foreground">
                        {t("editor.uploadDialog.heightBeads")}
                      </Label>
                      <Slider
                        value={[Number(heightBeads) || 1]}
                        onValueChange={([val]) => handleHeightBeadsChange(String(val))}
                        min={1}
                        max={200}
                        className="[&_[data-slot=slider-range]]:bg-pink-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold">{t("editor.uploadDialog.offsetPx")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">X</Label>
                      <Input
                        value={offsetX}
                        onChange={(e) => setOffsetX(clampOffset(e.target.value))}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Y</Label>
                      <Input
                        value={offsetY}
                        onChange={(e) => setOffsetY(clampOffset(e.target.value))}
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="space-y-1 py-2">
                      <Label className="text-[10px] text-muted-foreground">
                        {t("editor.uploadDialog.horizontalOffset")}
                      </Label>
                      <Slider
                        value={[Number(offsetX) || 0]}
                        onValueChange={([val]) => setOffsetX(String(val))}
                        min={-200}
                        max={200}
                        className="[&_[data-slot=slider-range]]:bg-pink-500"
                      />
                    </div>
                    <div className="space-y-1 py-2">
                      <Label className="text-[10px] text-muted-foreground">
                        {t("editor.uploadDialog.verticalOffset")}
                      </Label>
                      <Slider
                        value={[Number(offsetY) || 0]}
                        onValueChange={([val]) => setOffsetY(String(val))}
                        min={-200}
                        max={200}
                        className="[&_[data-slot=slider-range]]:bg-pink-500"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-semibold">{t("editor.uploadDialog.extraction")}</h3>
              
              <Tabs value={extractionQuality} onValueChange={setExtractionQuality} className="w-full">
                <TabsList className="w-full grid grid-cols-3 h-9 bg-muted/30 p-1 rounded-xl">
                  <TabsTrigger value="recommended" className="text-[11px] rounded-lg data-[state=active]:shadow-sm">
                    {t("editor.uploadDialog.qualityRecommended")}
                  </TabsTrigger>
                  <TabsTrigger value="average" className="text-[11px] rounded-lg data-[state=active]:shadow-sm">
                    {t("editor.uploadDialog.qualityAverage")}
                  </TabsTrigger>
                  <TabsTrigger value="high" className="text-[11px] rounded-lg data-[state=active]:shadow-sm">
                    {t("editor.uploadDialog.qualityHigh")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-2">
                <Label className="text-[11px] font-semibold">{t("editor.uploadDialog.colorManagement")}</Label>
                <Select value={colorPalette} onValueChange={setColorPalette}>
                  <SelectTrigger className="w-full rounded-xl bg-transparent border-input/60 hover:bg-muted/10 h-9">
                    <SelectValue placeholder={t("editor.uploadDialog.currentEditorPalette")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="current" className="rounded-lg">{t("editor.uploadDialog.currentEditorPalette")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold">{t("editor.uploadDialog.colorMerging")}</Label>
                  <Switch 
                    checked={colorMerging} 
                    onCheckedChange={setColorMerging}
                    className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500" 
                  />
                </div>

                {colorMerging && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-medium text-muted-foreground">
                        {t("editor.uploadDialog.colorMergeThreshold")}
                      </Label>
                      <span className="text-[11px] font-medium">{colorMergeThreshold[0]}</span>
                    </div>
                    <Slider
                      value={colorMergeThreshold}
                      onValueChange={setColorMergeThreshold}
                      min={1}
                      max={100}
                      className="[&_[data-slot=slider-range]]:bg-pink-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-3 md:space-y-4">
            <div className="flex items-center justify-between pt-3">
              <h3 className="text-sm font-semibold">{t("editor.uploadDialog.originalImage")}</h3>
            </div>

            <div className="rounded-xl border bg-muted/20 aspect-video flex items-center justify-center text-sm text-muted-foreground">
              {t("editor.uploadDialog.uploadPhoto")}
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("editor.uploadDialog.resultPreview")}</h3>
            </div>

            <div className="rounded-xl border bg-muted/20 aspect-video" />
          </div>
        </div>

        <Separator className="shrink-0" />

        <div className="px-3 py-2.5 md:px-6 md:py-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">{t("editor.uploadDialog.cancel")}</Button>
          </DialogClose>
          <Button className="w-full sm:w-auto gap-2 bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90 border-none text-white font-medium">
            <Sparkles className="size-4" />
            {t("editor.uploadDialog.generate")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
