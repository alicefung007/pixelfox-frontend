import { type TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Minus, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { getSystemPalette } from "@/lib/palettes";
import { createColorMatcher } from "@/lib/image-processor";
import { cn, isDarkColor, normalizeHex } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";
import { usePaletteStore } from "@/store/usePaletteStore";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type RenderResult = {
  dataUrl: string;
  width: number;
  height: number;
};

type ExportDialogSettings = {
  autoCrop: boolean;
  whiteBackground: boolean;
  showGrid: boolean;
  showMinorGrid: boolean;
  gridInterval: number;
  gridColor: string;
  showAxis: boolean;
  showColorCode: boolean;
  mirrorFlip: boolean;
};

type ReactTouchList = TouchEvent<HTMLDivElement>["touches"];

const GRID_COLORS = [
  "#000000",
  "#374151",
  "#9CA3AF",
  "#F9FAFB",
  "#EF4444",
  "#2563EB",
  "#22C55E",
  "#F59E0B",
  "#A855F7",
  "#EC4899",
  "#06B6D4",
];

const CELL_SIZE = 40;
const AXIS_SIZE = 28;
const MAX_EXPORT_EDGE = 4096;
const MAJOR_GRID_WIDTH = 2;
const MINOR_GRID_WIDTH = 2;
const PREVIEW_MIN_SCALE = 0.5;
const PREVIEW_MAX_SCALE = 5;
const PREVIEW_SCALE_STEP = 0.12;
const PREVIEW_PAN_SPEED = 1;
const EXPORT_DIALOG_SETTINGS_STORAGE_KEY = "pixelfox-export-dialog-settings";
const DEFAULT_EXPORT_DIALOG_SETTINGS: ExportDialogSettings = {
  autoCrop: true,
  whiteBackground: true,
  showGrid: true,
  showMinorGrid: true,
  gridInterval: 10,
  gridColor: GRID_COLORS[0],
  showAxis: false,
  showColorCode: true,
  mirrorFlip: false,
};

function loadExportDialogSettings(): ExportDialogSettings {
  if (typeof window === "undefined") {
    return DEFAULT_EXPORT_DIALOG_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(EXPORT_DIALOG_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_EXPORT_DIALOG_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ExportDialogSettings>;
    const nextGridColor = typeof parsed.gridColor === "string" && GRID_COLORS.includes(parsed.gridColor)
      ? parsed.gridColor
      : DEFAULT_EXPORT_DIALOG_SETTINGS.gridColor;
    const nextGridInterval = typeof parsed.gridInterval === "number"
      ? Math.min(30, Math.max(1, Math.round(parsed.gridInterval)))
      : DEFAULT_EXPORT_DIALOG_SETTINGS.gridInterval;

    return {
      autoCrop: parsed.autoCrop ?? DEFAULT_EXPORT_DIALOG_SETTINGS.autoCrop,
      whiteBackground: parsed.whiteBackground ?? DEFAULT_EXPORT_DIALOG_SETTINGS.whiteBackground,
      showGrid: parsed.showGrid ?? DEFAULT_EXPORT_DIALOG_SETTINGS.showGrid,
      showMinorGrid: parsed.showMinorGrid ?? DEFAULT_EXPORT_DIALOG_SETTINGS.showMinorGrid,
      gridInterval: nextGridInterval,
      gridColor: nextGridColor,
      showAxis: parsed.showAxis ?? DEFAULT_EXPORT_DIALOG_SETTINGS.showAxis,
      showColorCode: parsed.showColorCode ?? DEFAULT_EXPORT_DIALOG_SETTINGS.showColorCode,
      mirrorFlip: parsed.mirrorFlip ?? DEFAULT_EXPORT_DIALOG_SETTINGS.mirrorFlip,
    };
  } catch {
    return DEFAULT_EXPORT_DIALOG_SETTINGS;
  }
}

function clampPreviewScale(scale: number) {
  return Math.min(PREVIEW_MAX_SCALE, Math.max(PREVIEW_MIN_SCALE, Number(scale.toFixed(2))));
}

function getTouchDistance(touches: ReactTouchList) {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchMidpoint(touches: ReactTouchList) {
  if (touches.length < 2) return { x: 0, y: 0 };
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

function getPixelBounds(pixels: Record<string, string>, width: number, height: number): Bounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (const key of Object.keys(pixels)) {
    const [x, y] = key.split(",").map(Number);
    if (Number.isNaN(x) || Number.isNaN(y)) continue;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  if (maxX < 0 || maxY < 0) return null;
  return { minX, minY, maxX, maxY };
}

function clampCellSize(cellSize: number, cols: number, rows: number, axisSize: number) {
  const maxAxis = axisSize * 2;
  const maxByWidth = Math.floor((MAX_EXPORT_EDGE - maxAxis) / Math.max(cols, 1));
  const maxByHeight = Math.floor((MAX_EXPORT_EDGE - maxAxis) / Math.max(rows, 1));
  return Math.max(8, Math.min(cellSize, maxByWidth, maxByHeight));
}

function getContrastText(color: string) {
  return isDarkColor(color) ? "#FFFFFF" : "rgba(17,24,39,0.78)";
}

function drawVerticalGridLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  width: number
) {
  const alignedWidth = Math.max(1, Math.round(width));
  const startX = Math.round(x - alignedWidth / 2);
  ctx.fillRect(startX, Math.round(y), alignedWidth, Math.round(height));
}

function drawHorizontalGridLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const alignedHeight = Math.max(1, Math.round(height));
  const startY = Math.round(y - alignedHeight / 2);
  ctx.fillRect(Math.round(x), startY, Math.round(width), alignedHeight);
}

function hexToRgbTuple(hex: string) {
  const normalized = normalizeHex(hex);
  if (normalized.length !== 6) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function renderPatternImage(options: {
  pixels: Record<string, string>;
  width: number;
  height: number;
  paletteLabels: Map<string, string>;
  autoCrop: boolean;
  whiteBackground: boolean;
  showGrid: boolean;
  showMinorGrid: boolean;
  gridInterval: number;
  gridColor: string;
  showAxis: boolean;
  showColorCode: boolean;
  mirrorFlip: boolean;
}): RenderResult | null {
  if (typeof document === "undefined") return null;

  const {
    pixels,
    width,
    height,
    paletteLabels,
    autoCrop,
    whiteBackground,
    showGrid,
    showMinorGrid,
    gridInterval,
    gridColor,
    showAxis,
    showColorCode,
    mirrorFlip,
  } = options;

  const sourceBounds = autoCrop ? getPixelBounds(pixels, width, height) : null;
  if (autoCrop && !sourceBounds) return null;

  const bounds = sourceBounds ?? {
    minX: 0,
    minY: 0,
    maxX: width - 1,
    maxY: height - 1,
  };

  const cols = bounds.maxX - bounds.minX + 1;
  const rows = bounds.maxY - bounds.minY + 1;
  if (cols <= 0 || rows <= 0) return null;

  const axisSize = showAxis ? AXIS_SIZE : 0;
  const cellSize = clampCellSize(CELL_SIZE, cols, rows, axisSize);
  const exportWidth = cols * cellSize + axisSize * 2;
  const exportHeight = rows * cellSize + axisSize * 2;

  const canvas = document.createElement("canvas");
  canvas.width = exportWidth;
  canvas.height = exportHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;

  const gridOriginX = axisSize;
  const gridOriginY = axisSize;
  const contentWidth = cols * cellSize;
  const contentHeight = rows * cellSize;

  if (whiteBackground) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, exportWidth, exportHeight);
  } else {
    ctx.clearRect(0, 0, exportWidth, exportHeight);
  }

  if (showAxis) {
    ctx.fillStyle = whiteBackground ? "#F8FAFC" : "rgba(248,250,252,0.96)";
    ctx.fillRect(0, 0, exportWidth, axisSize);
    ctx.fillRect(0, exportHeight - axisSize, exportWidth, axisSize);
    ctx.fillRect(0, 0, axisSize, exportHeight);
    ctx.fillRect(exportWidth - axisSize, 0, axisSize, exportHeight);
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const sourceX = mirrorFlip ? bounds.maxX - col : bounds.minX + col;
      const sourceY = bounds.minY + row;
      const color = pixels[`${sourceX},${sourceY}`];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(
        gridOriginX + col * cellSize,
        gridOriginY + row * cellSize,
        cellSize,
        cellSize
      );
    }
  }

  if (showColorCode) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const sourceX = mirrorFlip ? bounds.maxX - col : bounds.minX + col;
        const sourceY = bounds.minY + row;
        const color = pixels[`${sourceX},${sourceY}`];
        if (!color) continue;

        const normalized = normalizeHex(color);
        const label = paletteLabels.get(normalized);
        if (!label) continue;
        const text = label;
        const fontSize = Math.max(8, Math.min(14, Math.floor(cellSize / Math.max(text.length * 0.62, 2.8))));
        ctx.font = `700 ${fontSize}px Geist, sans-serif`;
        ctx.fillStyle = getContrastText(color);
        ctx.fillText(
          text,
          gridOriginX + col * cellSize + cellSize / 2,
          gridOriginY + row * cellSize + cellSize / 2
        );
      }
    }
  }

  if (showGrid) {
    if (showMinorGrid) {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = gridColor;
      for (let col = 0; col <= cols; col += 1) {
        const x = gridOriginX + col * cellSize;
        drawVerticalGridLine(ctx, x, gridOriginY, contentHeight, MINOR_GRID_WIDTH);
      }
      for (let row = 0; row <= rows; row += 1) {
        const y = gridOriginY + row * cellSize;
        drawHorizontalGridLine(ctx, gridOriginX, y, contentWidth, MINOR_GRID_WIDTH);
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = gridColor;
    for (let col = 0; col <= cols; col += gridInterval) {
      const x = gridOriginX + col * cellSize;
      drawVerticalGridLine(ctx, x, gridOriginY, contentHeight, MAJOR_GRID_WIDTH);
    }
    if (cols % gridInterval !== 0) {
      drawVerticalGridLine(ctx, gridOriginX + contentWidth, gridOriginY, contentHeight, MAJOR_GRID_WIDTH);
    }
    for (let row = 0; row <= rows; row += gridInterval) {
      const y = gridOriginY + row * cellSize;
      drawHorizontalGridLine(ctx, gridOriginX, y, contentWidth, MAJOR_GRID_WIDTH);
    }
    if (rows % gridInterval !== 0) {
      drawHorizontalGridLine(ctx, gridOriginX, gridOriginY + contentHeight, contentWidth, MAJOR_GRID_WIDTH);
    }
  } else {
    ctx.strokeStyle = "rgba(15,23,42,0.16)";
    ctx.lineWidth = 1;
    ctx.strokeRect(gridOriginX + 0.5, gridOriginY + 0.5, contentWidth, contentHeight);
  }

  if (showAxis) {
    ctx.fillStyle = "#334155";
    ctx.font = `600 ${Math.max(12, Math.floor(axisSize * 0.52))}px Geist, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let col = 0; col < cols; col += 1) {
      const text = autoCrop
        ? String(col + 1)
        : String(mirrorFlip ? bounds.maxX - col + 1 : bounds.minX + col + 1);
      const x = gridOriginX + col * cellSize + cellSize / 2;
      ctx.fillText(text, x, axisSize / 2);
      ctx.fillText(text, x, exportHeight - axisSize / 2);
    }

    for (let row = 0; row < rows; row += 1) {
      const text = autoCrop ? String(row + 1) : String(bounds.minY + row + 1);
      const y = gridOriginY + row * cellSize + cellSize / 2;
      ctx.fillText(text, axisSize / 2, y);
      ctx.fillText(text, exportWidth - axisSize / 2, y);
    }
  }

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: exportWidth,
    height: exportHeight,
  };
}

export default function ExportPatternDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const pixels = useEditorStore((state) => state.pixels);
  const width = useEditorStore((state) => state.width);
  const height = useEditorStore((state) => state.height);
  const currentPaletteId = usePaletteStore((state) => state.currentPaletteId);
  const [persistedSettings, setPersistedSettings] = useState<ExportDialogSettings>(() => loadExportDialogSettings());
  const [autoCrop, setAutoCrop] = useState(persistedSettings.autoCrop);
  const [whiteBackground, setWhiteBackground] = useState(persistedSettings.whiteBackground);
  const [showGrid, setShowGrid] = useState(persistedSettings.showGrid);
  const [showMinorGrid, setShowMinorGrid] = useState(persistedSettings.showMinorGrid);
  const [gridInterval, setGridInterval] = useState([persistedSettings.gridInterval]);
  const [gridColor, setGridColor] = useState(persistedSettings.gridColor);
  const [showAxis, setShowAxis] = useState(persistedSettings.showAxis);
  const [showColorCode, setShowColorCode] = useState(persistedSettings.showColorCode);
  const [mirrorFlip, setMirrorFlip] = useState(persistedSettings.mirrorFlip);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 });
  const [previewViewportElement, setPreviewViewportElement] = useState<HTMLDivElement | null>(null);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const previewScaleRef = useRef(previewScale);
  const previewOffsetRef = useRef(previewOffset);
  const previewGestureRef = useRef<{
    distance: number;
    midpoint: { x: number; y: number };
    scale: number;
    offset: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    previewScaleRef.current = previewScale;
  }, [previewScale]);

  useEffect(() => {
    previewOffsetRef.current = previewOffset;
  }, [previewOffset]);

  useEffect(() => {
    const nextSettings: ExportDialogSettings = {
      autoCrop,
      whiteBackground,
      showGrid,
      showMinorGrid,
      gridInterval: gridInterval[0],
      gridColor,
      showAxis,
      showColorCode,
      mirrorFlip,
    };

    setPersistedSettings((current) => {
      const unchanged =
        current.autoCrop === nextSettings.autoCrop &&
        current.whiteBackground === nextSettings.whiteBackground &&
        current.showGrid === nextSettings.showGrid &&
        current.showMinorGrid === nextSettings.showMinorGrid &&
        current.gridInterval === nextSettings.gridInterval &&
        current.gridColor === nextSettings.gridColor &&
        current.showAxis === nextSettings.showAxis &&
        current.showColorCode === nextSettings.showColorCode &&
        current.mirrorFlip === nextSettings.mirrorFlip;

      return unchanged ? current : nextSettings;
    });
  }, [
    autoCrop,
    whiteBackground,
    showGrid,
    showMinorGrid,
    gridInterval,
    gridColor,
    showAxis,
    showColorCode,
    mirrorFlip,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EXPORT_DIALOG_SETTINGS_STORAGE_KEY, JSON.stringify(persistedSettings));
  }, [persistedSettings]);

  const paletteLabels = useMemo(() => {
    const palette = getSystemPalette(currentPaletteId);
    if (!palette) return new Map<string, string>();

    const matcher = createColorMatcher(palette);
    const resolved = new Map<string, string>();
    const uniqueColors = new Set(Object.values(pixels).map((color) => normalizeHex(color)));

    uniqueColors.forEach((color) => {
      const rgb = hexToRgbTuple(color);
      if (!rgb) return;
      const exactLabel = palette.swatches.find((swatch) => normalizeHex(swatch.color) === color)?.label;
      if (exactLabel) {
        resolved.set(color, exactLabel);
        return;
      }
      const nearest = matcher.findNearestColor(rgb.r, rgb.g, rgb.b);
      resolved.set(color, nearest.label);
    });

    return resolved;
  }, [currentPaletteId, pixels]);

  const exportResult = useMemo(
    () =>
      renderPatternImage({
        pixels,
        width,
        height,
        paletteLabels,
        autoCrop,
        whiteBackground,
        showGrid,
        showMinorGrid,
        gridInterval: gridInterval[0],
        gridColor,
        showAxis,
        showColorCode,
        mirrorFlip,
      }),
    [
      pixels,
      width,
      height,
      paletteLabels,
      autoCrop,
      whiteBackground,
      showGrid,
      showMinorGrid,
      gridInterval,
      gridColor,
      showAxis,
      showColorCode,
      mirrorFlip,
    ]
  );

  useEffect(() => {
    if (!open) return;
    resetPreviewTransform();
  }, [open, exportResult?.dataUrl]);

  const handleDownload = () => {
    if (!exportResult || typeof document === "undefined") return;

    const link = document.createElement("a");
    link.href = exportResult.dataUrl;
    link.download = `pixelfox-pattern-${width}x${height}.png`;
    link.click();
  };

  const zoomPreviewAtPoint = (nextScale: number, anchor: { x: number; y: number }) => {
    const element = previewViewportRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const currentScale = previewScaleRef.current;
    const currentOffset = previewOffsetRef.current;
    const clampedScale = clampPreviewScale(nextScale);
    const anchorX = anchor.x - rect.left;
    const anchorY = anchor.y - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    if (clampedScale === currentScale) return;

    const worldX = (anchorX - centerX - currentOffset.x) / currentScale;
    const worldY = (anchorY - centerY - currentOffset.y) / currentScale;

    const nextOffset = {
      x: anchorX - centerX - worldX * clampedScale,
      y: anchorY - centerY - worldY * clampedScale,
    };

    previewScaleRef.current = clampedScale;
    previewOffsetRef.current = nextOffset;
    setPreviewScale(clampedScale);
    setPreviewOffset(nextOffset);
  };

  const panPreviewByDelta = (dx: number, dy: number) => {
    const nextOffset = {
      x: previewOffsetRef.current.x - dx * PREVIEW_PAN_SPEED,
      y: previewOffsetRef.current.y - dy * PREVIEW_PAN_SPEED,
    };
    previewOffsetRef.current = nextOffset;
    setPreviewOffset(nextOffset);
  };

  const stepPreviewScale = (delta: number) => {
    const element = previewViewportRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    zoomPreviewAtPoint(previewScaleRef.current + delta, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };

  const resetPreviewTransform = () => {
    previewScaleRef.current = 1;
    previewOffsetRef.current = { x: 0, y: 0 };
    setPreviewScale(1);
    setPreviewOffset({ x: 0, y: 0 });
  };

  const handlePreviewTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!exportResult) return;
    if (event.touches.length < 2) return;

    event.preventDefault();
    const element = previewViewportRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const midpoint = getTouchMidpoint(event.touches);
    previewGestureRef.current = {
      distance: getTouchDistance(event.touches),
      midpoint: {
        x: midpoint.x - rect.left,
        y: midpoint.y - rect.top,
      },
      scale: previewScaleRef.current,
      offset: previewOffsetRef.current,
    };
  };

  const handlePreviewTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!exportResult) return;
    if (event.touches.length < 2) return;

    event.preventDefault();
    const start = previewGestureRef.current;
    const element = previewViewportRef.current;
    if (!start || !element) return;

    const rect = element.getBoundingClientRect();
    const currentDistance = getTouchDistance(event.touches);
    const midpoint = getTouchMidpoint(event.touches);
    const screenMidpoint = {
      x: midpoint.x - rect.left,
      y: midpoint.y - rect.top,
    };

    if (currentDistance <= 0 || start.distance <= 0) return;

    const nextScale = clampPreviewScale(start.scale * (currentDistance / start.distance));
    const worldX = (start.midpoint.x - rect.width / 2 - start.offset.x) / start.scale;
    const worldY = (start.midpoint.y - rect.height / 2 - start.offset.y) / start.scale;

    const nextOffset = {
      x: screenMidpoint.x - rect.width / 2 - worldX * nextScale,
      y: screenMidpoint.y - rect.height / 2 - worldY * nextScale,
    };

    previewScaleRef.current = nextScale;
    previewOffsetRef.current = nextOffset;
    setPreviewScale(nextScale);
    setPreviewOffset(nextOffset);
  };

  const handlePreviewTouchEnd = () => {
    previewGestureRef.current = null;
  };

  useEffect(() => {
    if (!open) return;
    const element = previewViewportElement;
    if (!element) return;

    const handleNativeWheel = (event: globalThis.WheelEvent) => {
      if (!exportResult) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp(-event.deltaY / 80);
        zoomPreviewAtPoint(previewScaleRef.current * factor, { x: event.clientX, y: event.clientY });
        return;
      }

      let dx = event.deltaX;
      let dy = event.deltaY;
      if (event.deltaMode === 1) {
        dx *= 16;
        dy *= 16;
      } else if (event.deltaMode === 2) {
        dx *= element.clientWidth;
        dy *= element.clientHeight;
      }
      panPreviewByDelta(dx, dy);
    };

    const handleDocumentWheel = (event: globalThis.WheelEvent) => {
      if (!exportResult) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!element.contains(target)) return;

      event.preventDefault();
      event.stopPropagation();
      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp(-event.deltaY / 80);
        zoomPreviewAtPoint(previewScaleRef.current * factor, { x: event.clientX, y: event.clientY });
        return;
      }

      let dx = event.deltaX;
      let dy = event.deltaY;
      if (event.deltaMode === 1) {
        dx *= 16;
        dy *= 16;
      } else if (event.deltaMode === 2) {
        dx *= element.clientWidth;
        dy *= element.clientHeight;
      }
      panPreviewByDelta(dx, dy);
    };

    const preventGestureZoom = (event: Event) => {
      if (!exportResult) return;
      event.preventDefault();
      event.stopPropagation();
    };

    element.addEventListener("wheel", handleNativeWheel, { passive: false });
    document.addEventListener("wheel", handleDocumentWheel, { passive: false, capture: true });
    element.addEventListener("gesturestart", preventGestureZoom as EventListener, { passive: false });
    element.addEventListener("gesturechange", preventGestureZoom as EventListener, { passive: false });
    element.addEventListener("gestureend", preventGestureZoom as EventListener, { passive: false });
    document.addEventListener("gesturestart", preventGestureZoom as EventListener, { passive: false, capture: true });
    document.addEventListener("gesturechange", preventGestureZoom as EventListener, { passive: false, capture: true });
    document.addEventListener("gestureend", preventGestureZoom as EventListener, { passive: false, capture: true });

    return () => {
      element.removeEventListener("wheel", handleNativeWheel);
      document.removeEventListener("wheel", handleDocumentWheel, true);
      element.removeEventListener("gesturestart", preventGestureZoom as EventListener);
      element.removeEventListener("gesturechange", preventGestureZoom as EventListener);
      element.removeEventListener("gestureend", preventGestureZoom as EventListener);
      document.removeEventListener("gesturestart", preventGestureZoom as EventListener, true);
      document.removeEventListener("gesturechange", preventGestureZoom as EventListener, true);
      document.removeEventListener("gestureend", preventGestureZoom as EventListener, true);
    };
  }, [open, exportResult, previewViewportElement]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[980px] w-[calc(100vw-32px)] md:w-full p-0 flex flex-col gap-0 max-h-[95vh]">
        <DialogHeader className="px-3 pt-3 pb-2 md:px-6 md:pt-6 md:pb-4 shrink-0 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Download className="size-4" />
                </span>
                <span>{t("editor.exportDialog.title")}</span>
              </DialogTitle>
              <DialogDescription>{t("editor.exportDialog.description")}</DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X className="size-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <Separator className="shrink-0" />

        <div className="flex-1 overflow-auto px-3 pb-3 md:px-6 md:pb-6 flex flex-col md:flex-row md:items-stretch gap-3 md:gap-5">
          <div className="w-full md:w-[260px] md:shrink-0 space-y-3 md:space-y-4">
            <div className="space-y-4 pt-3">
              <h3 className="text-sm font-semibold">Settings</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-[11px] font-semibold">{t("editor.exportDialog.autoCrop")}</Label>
                    <div className="text-[10px] text-muted-foreground">
                      {t("editor.exportDialog.autoCropHint")}
                    </div>
                  </div>
                  <Switch
                    checked={autoCrop}
                    onCheckedChange={setAutoCrop}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-[11px] font-semibold">{t("editor.exportDialog.whiteBackground")}</Label>
                  <Switch
                    checked={whiteBackground}
                    onCheckedChange={setWhiteBackground}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-[11px] font-semibold">{t("editor.exportDialog.showColorCode")}</Label>
                  <Switch
                    checked={showColorCode}
                    onCheckedChange={setShowColorCode}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-[11px] font-semibold">{t("editor.exportDialog.showAxis")}</Label>
                    <div className="text-[10px] text-muted-foreground">
                      {t("editor.exportDialog.showAxisHint")}
                    </div>
                  </div>
                  <Switch
                    checked={showAxis}
                    onCheckedChange={setShowAxis}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-[11px] font-semibold">{t("editor.exportDialog.mirrorFlip")}</Label>
                    <div className="text-[10px] text-muted-foreground">
                      {t("editor.exportDialog.mirrorFlipHint")}
                    </div>
                  </div>
                  <Switch
                    checked={mirrorFlip}
                    onCheckedChange={setMirrorFlip}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
              </div>
            </div>

            <Separator className="shrink-0" />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Grid</h3>

              <div className="flex items-center justify-between gap-3">
                <Label className="text-[11px] font-semibold">{t("editor.exportDialog.showGrid")}</Label>
                <Switch
                  checked={showGrid}
                  onCheckedChange={setShowGrid}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <Label className={cn("text-[11px] font-semibold", !showGrid && "text-muted-foreground")}>
                  {t("editor.exportDialog.showMinorGrid")}
                </Label>
                <Switch
                  checked={showMinorGrid}
                  onCheckedChange={setShowMinorGrid}
                  disabled={!showGrid}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className={cn("text-[11px] font-semibold", !showGrid && "text-muted-foreground")}>
                    {t("editor.exportDialog.gridInterval")}
                  </Label>
                  <span className={cn("text-[11px] font-medium", !showGrid && "text-muted-foreground")}>
                    {gridInterval[0]}
                  </span>
                </div>
                <Slider
                  value={gridInterval}
                  onValueChange={setGridInterval}
                  min={1}
                  max={30}
                  disabled={!showGrid}
                  className={cn(
                    "[&_[data-slot=slider-range]]:bg-primary",
                    !showGrid && "[&_[data-slot=slider-range]]:bg-muted"
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label className={cn("text-[11px] font-semibold", !showGrid && "text-muted-foreground")}>
                  {t("editor.exportDialog.gridColor")}
                </Label>
                <div className={cn("grid grid-cols-6 gap-2", !showGrid && "opacity-50 pointer-events-none")}>
                  {GRID_COLORS.map((c) => {
                    const selected = c.toLowerCase() === gridColor.toLowerCase();
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setGridColor(c)}
                        className={cn(
                          "w-full aspect-square rounded-md border-2 transition-transform hover:scale-105 active:scale-95",
                          selected
                            ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.16)]"
                            : "border-gray-400/20"
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={c}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 pb-3 md:pb-4 md:flex md:flex-col md:self-stretch">
            <div className="pt-3 pb-4">
              <h3 className="text-sm font-semibold">{t("editor.exportDialog.preview")}</h3>
            </div>

            <div
              ref={(node) => {
                previewViewportRef.current = node;
                setPreviewViewportElement(node);
              }}
              className="relative rounded-xl border overflow-hidden overscroll-contain flex items-center justify-center min-h-[420px] md:min-h-0 md:flex-1 bg-[linear-gradient(45deg,#f5f5f5_25%,transparent_25%,transparent_75%,#f5f5f5_75%,#f5f5f5),linear-gradient(45deg,#f5f5f5_25%,transparent_25%,transparent_75%,#f5f5f5_75%,#f5f5f5)] bg-[length:10px_10px] bg-[position:0_0,5px_5px] bg-repeat [touch-action:none]"
              onTouchStart={handlePreviewTouchStart}
              onTouchMove={handlePreviewTouchMove}
              onTouchEnd={handlePreviewTouchEnd}
              onTouchCancel={handlePreviewTouchEnd}
            >
              {exportResult ? (
                <div className="flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden p-3">
                  <img
                    src={exportResult.dataUrl}
                    alt={t("editor.exportDialog.previewTitle")}
                    className="max-h-full max-w-full object-contain mx-auto border border-black/10 shadow-[0_12px_30px_rgba(15,23,42,0.12),0_2px_8px_rgba(15,23,42,0.08)] [image-rendering:pixelated]"
                    style={{
                      transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewScale})`,
                      transformOrigin: "center center",
                    }}
                  />
                </div>
              ) : (
                <div className="aspect-[3/4] w-full max-w-[420px] rounded-md border bg-transparent flex items-center justify-center text-sm text-muted-foreground">
                  {t("editor.exportDialog.previewPlaceholder")}
                </div>
              )}

              <div className="absolute top-3 right-3 flex items-center gap-1 rounded-xl border border-black/10 bg-background/92 p-1.5 shadow-sm backdrop-blur">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => stepPreviewScale(-PREVIEW_SCALE_STEP)}
                  disabled={!exportResult || previewScale <= PREVIEW_MIN_SCALE}
                >
                  <Minus className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 min-w-14 rounded-lg px-2 text-xs font-semibold tabular-nums"
                  onClick={resetPreviewTransform}
                  disabled={!exportResult}
                >
                  {Math.round(previewScale * 100)}%
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => stepPreviewScale(PREVIEW_SCALE_STEP)}
                  disabled={!exportResult || previewScale >= PREVIEW_MAX_SCALE}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Separator className="shrink-0" />

        <div className="px-3 py-2.5 md:px-6 md:py-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              {t("editor.exportDialog.close")}
            </Button>
          </DialogClose>
          <Button
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-none text-white font-medium"
            type="button"
            onClick={handleDownload}
            disabled={!exportResult}
          >
            <Download className="size-4" />
            {t("editor.exportDialog.downloadImage")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
