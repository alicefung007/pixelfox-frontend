import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Sparkles, ZoomIn } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function UploadPhotoDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const [adjustMode, setAdjustMode] = useState("pattern");
  const [previewTab, setPreviewTab] = useState("original");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[980px] p-0 overflow-hidden flex flex-col">
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

            <Card className="rounded-xl py-4 gap-4 shadow-none ring-1 ring-border/60">
              <CardHeader className="px-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">{t("editor.uploadDialog.gridSettings")}</CardTitle>
                  <Button variant="ghost" size="xs" className="h-7 px-2 text-xs text-muted-foreground">
                    <Sparkles className="size-3.5" />
                    {t("editor.uploadDialog.autoDetect")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[11px] text-muted-foreground">
                    {t("editor.uploadDialog.adjustmentMode")}
                  </Label>
                  <Tabs value={adjustMode} onValueChange={setAdjustMode}>
                    <TabsList className="h-8 bg-muted/50 p-1">
                      <TabsTrigger value="cell" className="h-6 px-3 text-[11px]">
                        {t("editor.uploadDialog.cellSize")}
                      </TabsTrigger>
                      <TabsTrigger value="pattern" className="h-6 px-3 text-[11px]">
                        {t("editor.uploadDialog.patternSize")}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold">
                      {t("editor.uploadDialog.patternSizeBeads")}
                    </Label>
                    <Button variant="ghost" size="icon-xs" className="text-muted-foreground">
                      ↔
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        {t("editor.uploadDialog.widthBeads")}
                      </Label>
                      <Input defaultValue="50" inputMode="numeric" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        {t("editor.uploadDialog.heightBeads")}
                      </Label>
                      <Input defaultValue="50" inputMode="numeric" />
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        {t("editor.uploadDialog.widthBeads")}
                      </Label>
                      <input type="range" min={1} max={200} defaultValue={50} className="w-full accent-pink-500" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        {t("editor.uploadDialog.heightBeads")}
                      </Label>
                      <input type="range" min={1} max={200} defaultValue={50} className="w-full accent-pink-500" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold">{t("editor.uploadDialog.offsetPx")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">X</Label>
                      <Input defaultValue="0.00" inputMode="decimal" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Y</Label>
                      <Input defaultValue="0.00" inputMode="decimal" />
                    </div>
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        {t("editor.uploadDialog.horizontalOffset")}
                      </Label>
                      <input type="range" min={-200} max={200} defaultValue={0} className="w-full accent-pink-500" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        {t("editor.uploadDialog.verticalOffset")}
                      </Label>
                      <input type="range" min={-200} max={200} defaultValue={0} className="w-full accent-pink-500" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("editor.uploadDialog.adjustAlign")}</h3>
              <Tabs value={previewTab} onValueChange={setPreviewTab}>
                <TabsList className="h-8 bg-muted/50 p-1">
                  <TabsTrigger value="original" className="h-6 px-3 text-[11px]">
                    {t("editor.uploadDialog.originalImage")}
                  </TabsTrigger>
                  <TabsTrigger value="adjust" className="h-6 px-3 text-[11px]">
                    {t("editor.uploadDialog.adjustAlign")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
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
