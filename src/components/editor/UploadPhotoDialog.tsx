import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Sparkles, Link, Unlink, Check, ChevronsUpDown, Upload, FlipHorizontal, FlipVertical, Crop } from "lucide-react";
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
import { SYSTEM_PALETTES, type SystemPaletteId } from "@/lib/palettes";
import { usePaletteStore } from "@/store/usePaletteStore";
import { convertImageToPixelArt, type ColorMatchResult } from "@/lib/image-processor";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (result: ColorMatchResult, paletteId: SystemPaletteId) => void;
};

function trimColorMatchResult(result: ColorMatchResult): ColorMatchResult {
  if (result.width <= 1 || result.height <= 1) {
    return result;
  }

  const { imageData, width, height } = result;
  const data = imageData.data;
  const cornerOffsets = [
    0,
    (width - 1) * 4,
    ((height - 1) * width) * 4,
    ((height * width) - 1) * 4,
  ];

  const counts = new Map<string, number>();
  cornerOffsets.forEach((offset) => {
    const key = `${data[offset]},${data[offset + 1]},${data[offset + 2]},${data[offset + 3]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  let backgroundColor = `${data[0]},${data[1]},${data[2]},${data[3]}`;
  let maxCount = 0;
  counts.forEach((count, key) => {
    if (count > maxCount) {
      backgroundColor = key;
      maxCount = count;
    }
  });

  const [bgR, bgG, bgB, bgA] = backgroundColor.split(",").map(Number);
  const isBackground = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    return (
      data[offset] === bgR &&
      data[offset + 1] === bgG &&
      data[offset + 2] === bgB &&
      data[offset + 3] === bgA
    );
  };

  let top = 0;
  while (top < height) {
    let allBackground = true;
    for (let x = 0; x < width; x += 1) {
      if (!isBackground(x, top)) {
        allBackground = false;
        break;
      }
    }
    if (!allBackground) break;
    top += 1;
  }

  let bottom = height - 1;
  while (bottom >= top) {
    let allBackground = true;
    for (let x = 0; x < width; x += 1) {
      if (!isBackground(x, bottom)) {
        allBackground = false;
        break;
      }
    }
    if (!allBackground) break;
    bottom -= 1;
  }

  let left = 0;
  while (left < width) {
    let allBackground = true;
    for (let y = top; y <= bottom; y += 1) {
      if (!isBackground(left, y)) {
        allBackground = false;
        break;
      }
    }
    if (!allBackground) break;
    left += 1;
  }

  let right = width - 1;
  while (right >= left) {
    let allBackground = true;
    for (let y = top; y <= bottom; y += 1) {
      if (!isBackground(right, y)) {
        allBackground = false;
        break;
      }
    }
    if (!allBackground) break;
    right -= 1;
  }

  if (top === 0 && bottom === height - 1 && left === 0 && right === width - 1) {
    return result;
  }

  const trimmedWidth = right - left + 1;
  const trimmedHeight = bottom - top + 1;
  if (trimmedWidth <= 0 || trimmedHeight <= 0) {
    return result;
  }

  const trimmedImageData = new ImageData(trimmedWidth, trimmedHeight);
  for (let y = 0; y < trimmedHeight; y += 1) {
    for (let x = 0; x < trimmedWidth; x += 1) {
      const srcOffset = ((top + y) * width + left + x) * 4;
      const dstOffset = (y * trimmedWidth + x) * 4;
      trimmedImageData.data[dstOffset] = data[srcOffset];
      trimmedImageData.data[dstOffset + 1] = data[srcOffset + 1];
      trimmedImageData.data[dstOffset + 2] = data[srcOffset + 2];
      trimmedImageData.data[dstOffset + 3] = data[srcOffset + 3];
    }
  }

  return {
    ...result,
    imageData: trimmedImageData,
    width: trimmedWidth,
    height: trimmedHeight,
    beadCount: trimmedWidth * trimmedHeight,
  };
}

export default function UploadPhotoDialog({ open, onOpenChange, onGenerate }: Props) {
  const { t } = useTranslation();
  
  // Pattern size beads (1-200)
  const [widthBeads, setWidthBeads] = useState("60");
  const [heightBeads, setHeightBeads] = useState("60");
  const [processingDimensions, setProcessingDimensions] = useState({ width: "60", height: "60" });
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true);

  // Offset values (-200 to 200)
  const [offsetX, setOffsetX] = useState("0");
  const [offsetY, setOffsetY] = useState("0");

  // Extraction settings
  const [extractionQuality, setExtractionQuality] = useState("recommended");
  const [colorPaletteId, setColorPaletteId] = useState<SystemPaletteId>(SYSTEM_PALETTES[0].id);
  const [colorMerging, setColorMerging] = useState(true);
  const [colorMergeThreshold, setColorMergeThreshold] = useState([2]);
  const [palettePopoverOpen, setPalettePopoverOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState<ColorMatchResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);
  const widthBeadsRef = useRef(processingDimensions.width);

  // Image flip state
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);

  // Image rotation state (0, 90, 180, 270)
  const [rotation, setRotation] = useState(0);
  const [trimEdges, setTrimEdges] = useState(false);

  widthBeadsRef.current = processingDimensions.width;

  // Sync color palette to editor's selected palette when dialog opens
  const currentPaletteId = usePaletteStore((s) => s.currentPaletteId);
  useEffect(() => {
    if (open) {
      setColorPaletteId(currentPaletteId);
    }
  }, [open, currentPaletteId]);

  // Truncate filename with ellipsis in the middle
  const truncateFilename = (name: string) => {
    if (name.length <= 100) return name;
    const half = Math.floor((100 - 3) / 2);
    return `${name.slice(0, half)}...${name.slice(-half)}`;
  };

  // Image preview URL - recreate when dialog opens with existing selectedFile
  const imagePreviewUrl = useMemo(() => {
    if (!selectedFile) return null;
    const url = URL.createObjectURL(selectedFile);
    return url;
  }, [selectedFile, open]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // When a non-square image is uploaded, unlock aspect ratio and set height proportionally based on width
  useEffect(() => {
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    const img = new Image();
    img.onload = () => {
      if (img.width !== img.height) {
        setAspectRatioLocked(false);
        const currentWidth = parseInt(widthBeadsRef.current, 10) || 60;
        const newHeight = Math.round(currentWidth * (img.height / img.width));
        const nextHeight = String(clamp(newHeight, 1, 200));
        setHeightBeads(nextHeight);
        setProcessingDimensions((prev) => ({ ...prev, height: nextHeight }));
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [selectedFile]);

  const selectedPalette = useMemo(
    () => SYSTEM_PALETTES.find((p) => p.id === colorPaletteId) ?? SYSTEM_PALETTES[0],
    [colorPaletteId]
  );

  // Process image when file or palette changes
  useEffect(() => {
    if (!imagePreviewUrl || !selectedFile) {
      setProcessedResult(null);
      return;
    }

    const processImage = async () => {
      setIsProcessing(true);
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = imagePreviewUrl;
        });

        // Apply flip transformations using canvas
        let processedImg = img;
        const needsTransform = flipHorizontal || flipVertical || rotation !== 0;

        if (needsTransform) {
          // Determine final dimensions after rotation
          let finalWidth = img.width;
          let finalHeight = img.height;
          if (rotation === 90 || rotation === 270) {
            finalWidth = img.height;
            finalHeight = img.width;
          }

          const transformCanvas = document.createElement("canvas");
          transformCanvas.width = finalWidth;
          transformCanvas.height = finalHeight;
          const ctx = transformCanvas.getContext("2d");
          if (ctx) {
            if (rotation !== 0) {
              ctx.translate(finalWidth / 2, finalHeight / 2);
              ctx.rotate((rotation * Math.PI) / 180);
              ctx.translate(-img.width / 2, -img.height / 2);
            } else {
              // No rotation, just flip
              ctx.translate(flipHorizontal ? img.width : 0, flipVertical ? img.height : 0);
              ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
            }
            ctx.drawImage(img, 0, 0);
            processedImg = new Image();
            processedImg.src = transformCanvas.toDataURL();
            await new Promise<void>((resolve, reject) => {
              processedImg.onload = () => resolve();
              processedImg.onerror = reject;
            });
          }
        }

        const poolSize = colorMerging ? colorMergeThreshold[0] : 1;

        const result = await convertImageToPixelArt(processedImg, selectedPalette, {
          width: (parseInt(processingDimensions.width, 10) || 60) * poolSize,
          height: (parseInt(processingDimensions.height, 10) || 60) * poolSize,
          poolSize,
          ciede2000Threshold: colorMerging ? colorMergeThreshold[0] : 0,
        });
        setProcessedResult(result);
      } catch (error) {
        console.error("Failed to process image:", error);
        setProcessedResult(null);
      } finally {
        setIsProcessing(false);
      }
    };

    processImage();
  }, [imagePreviewUrl, selectedPalette, processingDimensions.width, processingDimensions.height, colorMergeThreshold, flipHorizontal, flipVertical, rotation]);

  const effectiveResult = useMemo(
    () => (processedResult && trimEdges ? trimColorMatchResult(processedResult) : processedResult),
    [processedResult, trimEdges]
  );

  useEffect(() => {
    if (!trimEdges) {
      if (widthBeads !== processingDimensions.width) {
        setWidthBeads(processingDimensions.width);
      }
      if (heightBeads !== processingDimensions.height) {
        setHeightBeads(processingDimensions.height);
      }
      return;
    }

    if (!effectiveResult) return;

    const nextWidth = String(effectiveResult.width);
    const nextHeight = String(effectiveResult.height);
    if (widthBeads !== nextWidth) {
      setWidthBeads(nextWidth);
    }
    if (heightBeads !== nextHeight) {
      setHeightBeads(nextHeight);
    }
  }, [trimEdges, effectiveResult, processingDimensions.width, processingDimensions.height, widthBeads, heightBeads]);

  useEffect(() => {
    if (!effectiveResult) return;
    const canvas = resultCanvasRef.current;
    if (!canvas) return;

    canvas.width = effectiveResult.width;
    canvas.height = effectiveResult.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.putImageData(effectiveResult.imageData, 0, 0);
    }
  }, [effectiveResult]);

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
      const currentHeight = parseInt(processingDimensions.height, 10) || 1;
      const currentWidth = parseInt(processingDimensions.width, 10) || 1;
      if (currentWidth > 0) {
        const ratio = currentHeight / currentWidth;
        const newHeight = Math.round(newWidth * ratio);
        const nextHeight = String(clamp(newHeight, 1, 200));
        setHeightBeads(nextHeight);
        setProcessingDimensions({ width: clamped, height: nextHeight });
        return;
      }
    }
    setProcessingDimensions((prev) => ({ ...prev, width: clamped }));
  };

  const handleHeightBeadsChange = (val: string) => {
    const clamped = clampBeads(val);
    setHeightBeads(clamped);
    if (aspectRatioLocked && clamped !== "") {
      const newHeight = parseInt(clamped, 10);
      const currentHeight = parseInt(processingDimensions.height, 10) || 1;
      const currentWidth = parseInt(processingDimensions.width, 10) || 1;
      if (currentHeight > 0) {
        const ratio = currentWidth / currentHeight;
        const newWidth = Math.round(newHeight * ratio);
        const nextWidth = String(clamp(newWidth, 1, 200));
        setWidthBeads(nextWidth);
        setProcessingDimensions({ width: nextWidth, height: clamped });
        return;
      }
    }
    setProcessingDimensions((prev) => ({ ...prev, height: clamped }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[980px] w-[calc(100vw-32px)] md:w-full p-0 flex flex-col gap-0 max-h-[95vh]">
        <DialogHeader className="px-3 pt-3 pb-2 md:px-6 md:pt-6 md:pb-4 shrink-0 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <DialogTitle className="flex items-center gap-2">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Upload className="size-4" />
                </span>
                <span>{t("editor.uploadDialog.title")}</span>
              </DialogTitle>
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
                  "relative flex flex-col items-center justify-center w-full h-20 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
                  isDragging
                    ? "border-primary bg-primary/10 border-solid"
                    : selectedFile
                    ? "border-primary bg-primary/5"
                    : "border-input/60 hover:border-primary hover:bg-muted/30"
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
                    <Check className="w-6 h-6 text-primary" />
                    <span className="text-xs text-primary dark:text-primary/80 font-medium text-left px-1 break-all">
                      {truncateFilename(selectedFile.name)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="absolute top-1 right-1 p-1 bg-primary hover:bg-primary/80 rounded-full transition-colors"
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
                <div>
                  <Popover open={palettePopoverOpen} onOpenChange={setPalettePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full rounded-md bg-transparent border-input/60 hover:bg-muted/10 h-9 justify-between px-3 font-normal"
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
                    <PopoverContent
                      portalled={false}
                      className="w-[340px] max-h-[340px] p-0 !gap-0 flex flex-col"
                      align="start"
                    >
                      <div
                        ref={scrollRef}
                        className="w-[340px] max-h-[340px] overflow-y-auto overscroll-contain touch-pan-y"
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
                                  "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                                  isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                                )}
                              >
                                <div className="shrink-0">
                                  <div
                                    className={cn(
                                      "w-5 h-5 rounded-full border flex items-center justify-center",
                                      isSelected
                                        ? "bg-primary border-primary"
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
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold">{t("editor.uploadDialog.colorMerging")}</Label>
                  <Switch
                    checked={colorMerging}
                    onCheckedChange={setColorMerging}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
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
                    max={20}
                    disabled={!colorMerging}
                    className={cn(
                      "[&_[data-slot=slider-range]]:bg-primary",
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
                            setProcessingDimensions((prev) => ({ ...prev, height: prev.width }));
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
                      className="[&_[data-slot=slider-range]]:bg-primary"
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
                      className="[&_[data-slot=slider-range]]:bg-primary"
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
                      className="[&_[data-slot=slider-range]]:bg-primary"
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
                      className="[&_[data-slot=slider-range]]:bg-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-3 md:space-y-4 pb-3 md:pb-4">
            <div className="flex items-center justify-between pt-3">
              <h3 className="text-sm font-semibold">{t("editor.uploadDialog.patternPreview")}</h3>
              <div className="inline-flex items-center rounded-lg border bg-muted/30 p-0.5 gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "size-7 rounded-md min-w-[2.5rem] px-1.5",
                        rotation !== 0 && "bg-primary text-white hover:bg-primary/80 hover:text-white"
                      )}
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                    >
                      <span className="text-xs font-medium">R{rotation}°</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("editor.uploadDialog.rotate")}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "size-7 rounded-md",
                        trimEdges && "bg-primary text-white hover:bg-primary/80 hover:text-white"
                      )}
                      onClick={() => setTrimEdges((prev) => !prev)}
                    >
                      <Crop className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("editor.uploadDialog.trimEdges")}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "size-7 rounded-md",
                        flipHorizontal && "bg-primary text-white hover:bg-primary/80 hover:text-white"
                      )}
                      onClick={() => setFlipHorizontal(!flipHorizontal)}
                    >
                      <FlipHorizontal className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("editor.uploadDialog.flipHorizontal")}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "size-7 rounded-md",
                        flipVertical && "bg-primary text-white hover:bg-primary/80 hover:text-white"
                      )}
                      onClick={() => setFlipVertical(!flipVertical)}
                    >
                      <FlipVertical className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("editor.uploadDialog.flipVertical")}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="rounded-xl border bg-[linear-gradient(45deg,#f5f5f5_25%,transparent_25%,transparent_75%,#f5f5f5_75%,#f5f5f5),linear-gradient(45deg,#f5f5f5_25%,transparent_25%,transparent_75%,#f5f5f5_75%,#f5f5f5)] bg-[length:10px_10px] bg-[position:0_0,5px_5px] bg-repeat aspect-video overflow-hidden relative flex items-center justify-center">
              {isProcessing ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  {t("editor.uploadDialog.processing")}
                </div>
              ) : effectiveResult ? (
                <canvas
                  ref={resultCanvasRef}
                  className="h-full w-auto"
                  style={{
                    imageRendering: "pixelated",
                  }}
                />
              ) : (
                <span className="text-sm text-muted-foreground">
                  {t("editor.uploadDialog.patternPreviewPlaceholder")}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("editor.uploadDialog.originalImage")}</h3>
            </div>

            <div className="rounded-xl border bg-[linear-gradient(45deg,#f5f5f5_25%,transparent_25%,transparent_75%,#f5f5f5_75%,#f5f5f5),linear-gradient(45deg,#f5f5f5_25%,transparent_25%,transparent_75%,#f5f5f5_75%,#f5f5f5)] bg-[length:10px_10px] bg-[position:0_0,5px_5px] bg-repeat aspect-video overflow-hidden relative select-none">
              {imagePreviewUrl ? (
                <div
                  className="absolute inset-0"
                >
                  <img
                    src={imagePreviewUrl}
                    alt="Original"
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                  {t("editor.uploadDialog.uploadPhoto")}
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="shrink-0" />

        <div className="px-3 py-2.5 md:px-6 md:py-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">{t("editor.uploadDialog.cancel")}</Button>
          </DialogClose>
          <Button
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-none text-white font-medium"
            onClick={() => {
              if (effectiveResult) {
                onGenerate(effectiveResult, colorPaletteId);
                onOpenChange(false);
              }
            }}
          >
            <Sparkles className="size-4" />
            {t("editor.uploadDialog.generate")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
