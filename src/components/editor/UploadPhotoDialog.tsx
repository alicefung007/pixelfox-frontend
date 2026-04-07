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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

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

  // Clamp beads value between 1-200
  const clampBeads = (val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) return "";
    return String(Math.min(200, Math.max(1, num)));
  };

  // Clamp offset value between -200 to 200 (integers only)
  const clampOffset = (val: string) => {
    if (val === "" || val === "-") return val;
    const num = parseInt(val, 10);
    if (isNaN(num)) return "";
    return String(Math.min(200, Math.max(-200, num)));
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
        setHeightBeads(String(Math.min(200, Math.max(1, newHeight))));
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
        setWidthBeads(String(Math.min(200, Math.max(1, newWidth))));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[980px] p-0 overflow-hidden flex flex-col gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
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

        <Separator />

        <div className="px-6 py-4 flex gap-5 overflow-auto max-h-[70vh]">
          <div className="w-[260px] shrink-0 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">{t("editor.uploadDialog.uploadPhoto")}</Label>
              <Input type="file" />
            </div>

            <Card className="rounded-xl py-4 gap-4">
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
                              // Lock: set height to match width
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
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        {t("editor.uploadDialog.widthBeads")}
                      </Label>
                      <input
                        type="range"
                        min={1}
                        max={200}
                        value={Number(widthBeads) || 1}
                        onChange={(e) => handleWidthBeadsChange(e.target.value)}
                        className="w-full accent-pink-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        {t("editor.uploadDialog.heightBeads")}
                      </Label>
                      <input
                        type="range"
                        min={1}
                        max={200}
                        value={Number(heightBeads) || 1}
                        onChange={(e) => handleHeightBeadsChange(e.target.value)}
                        className="w-full accent-pink-500"
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
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        {t("editor.uploadDialog.horizontalOffset")}
                      </Label>
                      <input
                        type="range"
                        min={-200}
                        max={200}
                        value={Number(offsetX) || 0}
                        onChange={(e) => setOffsetX(e.target.value)}
                        className="w-full accent-pink-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        {t("editor.uploadDialog.verticalOffset")}
                      </Label>
                      <input
                        type="range"
                        min={-200}
                        max={200}
                        value={Number(offsetY) || 0}
                        onChange={(e) => setOffsetY(e.target.value)}
                        className="w-full accent-pink-500"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("editor.uploadDialog.originalImage")}</h3>
            </div>

            <div className="rounded-xl border bg-muted/20 h-[320px] flex items-center justify-center text-sm text-muted-foreground">
              {t("editor.uploadDialog.uploadPhoto")}
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("editor.uploadDialog.resultPreview")}</h3>
              <Button variant="ghost" size="icon-xs" className="text-muted-foreground">
                <ZoomIn className="size-3.5" />
              </Button>
            </div>

            <div className="rounded-xl border bg-background h-[140px]" />
          </div>
        </div>

        <Separator />

        <div className="px-6 py-4 flex items-center justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">{t("editor.uploadDialog.cancel")}</Button>
          </DialogClose>
          <Button className="gap-2 bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90 border-none text-white font-medium">
            <Sparkles className="size-4" />
            {t("editor.uploadDialog.generate")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
