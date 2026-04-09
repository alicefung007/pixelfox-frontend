import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, Sparkles, Link, Unlink, Check, ChevronsUpDown, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn, clamp } from "@/lib/utils";
import { SYSTEM_PALETTES } from "@/lib/palettes";

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
  const [colorPaletteId, setColorPaletteId] = useState<string>(SYSTEM_PALETTES[0].id);
  const [colorMerging, setColorMerging] = useState(true);
  const [colorMergeThreshold, setColorMergeThreshold] = useState([10]);
  const [palettePopoverOpen, setPalettePopoverOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Image transform state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const gestureRef = useRef(false);
  const gestureStartRef = useRef<{
    distance: number;
    midpoint: { x: number; y: number };
    scale: number;
    translate: { x: number; y: number };
  } | null>(null);

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchMidpoint = (touches: React.TouchList) => {
    if (touches.length < 2) return { x: 0, y: 0 };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      e.preventDefault();
      gestureRef.current = true;
      const container = imageContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        gestureStartRef.current = {
          distance: getTouchDistance(e.touches),
          midpoint: {
            x: getTouchMidpoint(e.touches).x - rect.left,
            y: getTouchMidpoint(e.touches).y - rect.top,
          },
          scale: scale,
          translate: { x: translate.x, y: translate.y },
        };
      }
      return;
    }
    setIsDraggingImage(true);
    setDragStart({ x: e.touches[0].clientX - translate.x, y: e.touches[0].clientY - translate.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (gestureRef.current && e.touches.length >= 2) {
      e.preventDefault();
      const start = gestureStartRef.current;
      if (!start) return;

      const container = imageContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const currentDistance = getTouchDistance(e.touches);
      const currentMidpoint = getTouchMidpoint(e.touches);
      const screenMidpoint = {
        x: currentMidpoint.x - rect.left,
        y: currentMidpoint.y - rect.top,
      };

      if (currentDistance > 0 && start.distance > 0) {
        const scaleDelta = currentDistance / start.distance;
        const newScale = Math.max(0.5, Math.min(3, start.scale * scaleDelta));
        setScale(newScale);

        const dx = screenMidpoint.x - start.midpoint.x;
        const dy = screenMidpoint.y - start.midpoint.y;

        const startScale = start.scale;
        const worldX = (start.midpoint.x - start.translate.x) / startScale;
        const worldY = (start.midpoint.y - start.translate.y) / startScale;

        setTranslate({
          x: screenMidpoint.x - worldX * newScale + dx,
          y: screenMidpoint.y - worldY * newScale + dy,
        });
      }
      return;
    }

    if (!isDraggingImage || e.touches.length !== 1) return;
    setTranslate({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      gestureRef.current = false;
      gestureStartRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsDraggingImage(false);
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDraggingImage(true);
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingImage) return;
    setTranslate({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDraggingImage(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const resetTransform = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  // Image preview URL
  const imagePreviewUrl = useMemo(() => {
    return selectedFile ? URL.createObjectURL(selectedFile) : null;
  }, [selectedFile]);

  const selectedPalette = useMemo(
    () => SYSTEM_PALETTES.find((p) => p.id === colorPaletteId) ?? SYSTEM_PALETTES[0],
    [colorPaletteId]
  );

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
              <h3 className="text-sm font-semibold">{t("editor.uploadDialog.uploadPhoto")}</h3>
              <div
                className={cn(
                  "relative flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
                  isDragging
                    ? "border-pink-500 bg-pink-500/10 border-solid"
                    : selectedFile
                    ? "border-pink-500 bg-pink-500/5"
                    : "border-input/60 hover:border-pink-400 hover:bg-muted/30"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith("image/")) {
                    setSelectedFile(file);
                  }
                }}
                onClick={() => {
                  fileInputRef.current?.click();
                }}
              >
                {selectedFile ? (
                  <>
                    <Check className="w-6 h-6 text-pink-500" />
                    <span className="text-xs text-pink-600 dark:text-pink-400 font-medium text-center px-1">
                      {selectedFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="absolute top-1 right-1 p-1 bg-pink-500 hover:bg-pink-600 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">
                      {t("editor.uploadDialog.uploadHint")}
                    </span>
                  </>
                )}
                <input
                  key={selectedFile ? "file-selected" : "file-empty"}
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                    }
                  }}
                />
              </div>
            </div>

            <Separator className="shrink-0" />

            <div className="space-y-4">
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
                <Popover open={palettePopoverOpen} onOpenChange={setPalettePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl bg-transparent border-input/60 hover:bg-muted/10 h-9 justify-between px-3 font-normal"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex -space-x-1">
                          {selectedPalette.swatches.slice(0, 10).map((swatch, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded-full border border-background shadow-sm"
                              style={{ backgroundColor: swatch.color }}
                            />
                          ))}
                        </div>
                        <span className="text-sm truncate">
                          {selectedPalette.i18nKey ? t(selectedPalette.i18nKey) : selectedPalette.name}
                        </span>
                      </div>
                      <ChevronsUpDown className="size-4 text-muted-foreground shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] max-h-[340px] p-0 !gap-0 flex flex-col" align="start">
                    <div
                      ref={scrollRef}
                      className="w-[340px] h-[340px] overflow-y-auto"
                      onWheel={(e) => {
                        e.preventDefault();
                        scrollRef.current!.scrollTop += e.deltaY;
                      }}
                    >
                      <div className="p-3 space-y-2">
                        {SYSTEM_PALETTES.map((palette) => {
                          const isSelected = palette.id === colorPaletteId;
                          return (
                            <button
                              key={palette.id}
                              type="button"
                              onClick={() => {
                                setColorPaletteId(palette.id);
                                setPalettePopoverOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 p-2 rounded-xl transition-colors text-left",
                                isSelected ? "bg-pink-500/10" : "hover:bg-muted/50"
                              )}
                            >
                              <div className="shrink-0">
                                <div
                                  className={cn(
                                    "w-5 h-5 rounded-full border flex items-center justify-center",
                                    isSelected
                                      ? "bg-pink-500 border-pink-500"
                                      : "border-input"
                                  )}
                                >
                                  {isSelected && <Check className="size-3 text-white" />}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium">
                                  {palette.i18nKey ? t(palette.i18nKey) : palette.name}
                                </div>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {palette.swatches.slice(0, 12).map((swatch, i) => (
                                    <div
                                      key={i}
                                      className="w-3 h-3 rounded-sm border border-foreground/5 shrink-0"
                                      style={{ backgroundColor: swatch.color }}
                                    />
                                  ))}
                                  {palette.swatches.length > 12 && (
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                      +{palette.swatches.length - 12}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground shrink-0">
                                {palette.swatches.length}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
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

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className={cn("text-[10px] font-medium", !colorMerging && "text-muted-foreground")}>
                      {t("editor.uploadDialog.colorMergeThreshold")}
                    </Label>
                    <span className={cn("text-[11px] font-medium", !colorMerging && "text-muted-foreground")}>
                      {colorMergeThreshold[0]}
                    </span>
                  </div>
                  <Slider
                    value={colorMergeThreshold}
                    onValueChange={setColorMergeThreshold}
                    min={1}
                    max={100}
                    disabled={!colorMerging}
                    className={cn(
                      "[&_[data-slot=slider-range]]:bg-pink-500",
                      !colorMerging && "[&_[data-slot=slider-range]]:bg-muted"
                    )}
                  />
                </div>
              </div>
            </div>

            <Separator className="shrink-0" />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t("editor.uploadDialog.gridSettings")}</h3>

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
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-3 md:space-y-4 pb-3 md:pb-4">
            <div className="flex items-center justify-between pt-3">
              <h3 className="text-sm font-semibold">{t("editor.uploadDialog.originalImage")}</h3>
            </div>

            <div className="rounded-xl border bg-[linear-gradient(45deg,#f5f5f5_25%,transparent_25%,transparent_75%,#f5f5f5_75%,#f5f5f5),linear-gradient(45deg,#f5f5f5_25%,transparent_25%,transparent_75%,#f5f5f5_75%,#f5f5f5)] bg-[length:10px_10px] bg-[position:0_0,5px_5px] bg-repeat aspect-video overflow-hidden relative select-none">
              {imagePreviewUrl ? (
                <div
                  ref={imageContainerRef}
                  className="absolute inset-0 cursor-move touch-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onWheel={handleWheel}
                >
                  <img
                    src={imagePreviewUrl}
                    alt="Original"
                    className="w-full h-full object-contain pointer-events-none"
                    style={{
                      transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                      transformOrigin: 'center center',
                    }}
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                  {t("editor.uploadDialog.uploadPhoto")}
                </div>
              )}
              {imagePreviewUrl && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-xs font-medium"
                  >
                    −
                  </button>
                  <span className="text-xs min-w-[3ch] text-center">{Math.round(scale * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setScale((s) => Math.min(3, s + 0.2))}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-xs font-medium"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={resetTransform}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-sm"
                  >
                    ↺
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("editor.uploadDialog.resultPreview")}</h3>
            </div>

            <div className="rounded-xl border bg-[linear-gradient(45deg,#f5f5f5_25%,transparent_25%,transparent_75%,#f5f5f5_75%,#f5f5f5),linear-gradient(45deg,#f5f5f5_25%,transparent_25%,transparent_75%,#f5f5f5_75%,#f5f5f5)] bg-[length:10px_10px] bg-[position:0_0,5px_5px] bg-repeat aspect-video flex items-center justify-center text-sm text-muted-foreground">
              {t("editor.uploadDialog.resultPreviewPlaceholder")}
            </div>
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
