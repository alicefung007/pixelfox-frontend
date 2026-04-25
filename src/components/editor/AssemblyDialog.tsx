import { type PointerEvent, type TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { getSystemPalette, type PaletteSwatch } from "@/lib/palettes";
import {
  clampPatternGridInterval,
  getNearWhiteSwatches,
  PATTERN_GRID_COLORS,
  sanitizePatternGridColor,
} from "@/components/editor/pattern-dialog-shared";
import { cn, hexToRgb, isDarkColor, isLikelyMouseWheel, normalizeHex } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";
import { usePaletteStore } from "@/store/usePaletteStore";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type AssemblyStep = {
  color: string;
  label: string;
  count: number;
};

type AssemblySettings = {
  showGrid: boolean;
  showMinorGrid: boolean;
  gridInterval: number;
  gridColor: string;
  showAxis: boolean;
  showColorCode: boolean;
  excludedColorCodes: string[];
  mirrorFlip: boolean;
};

type RenderResult = {
  dataUrl: string;
  width: number;
  height: number;
};

const CHECKER_LIGHT = "#F7F7F8";
const CHECKER_DARK = "#ECEEF1";
const ACTIVE_OUTLINE = "#F59E0B";
const AXIS_TEXT_COLOR = "#475569";
const ASSEMBLY_SETTINGS_STORAGE_KEY = "pixelfox-assembly-dialog-settings";
const PREVIEW_MIN_SCALE = 0.5;
const PREVIEW_MAX_SCALE = 10;
const PREVIEW_SCALE_STEP = 0.12;
const PREVIEW_PAN_SPEED = 1;
const ASSEMBLY_AXIS_SIZE = 32;
const ASSEMBLY_PREVIEW_CELL_SIZE = 28;
const ASSEMBLY_MIN_CELL_SIZE = 16;
const ASSEMBLY_MAX_EDGE = 4096;
const DEFAULT_ASSEMBLY_SETTINGS: AssemblySettings = {
  showGrid: true,
  showMinorGrid: true,
  gridInterval: 10,
  gridColor: PATTERN_GRID_COLORS[0],
  showAxis: false,
  showColorCode: false,
  excludedColorCodes: [],
  mirrorFlip: false,
};

function getFallbackLabel(index: number) {
  const letter = String.fromCharCode(65 + Math.floor(index / 9));
  return `${letter}${(index % 9) + 1}`;
}

function loadAssemblySettings(): AssemblySettings {
  if (typeof window === "undefined") return DEFAULT_ASSEMBLY_SETTINGS;

  try {
    const raw = window.localStorage.getItem(ASSEMBLY_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_ASSEMBLY_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AssemblySettings>;

    return {
      showGrid: parsed.showGrid ?? DEFAULT_ASSEMBLY_SETTINGS.showGrid,
      showMinorGrid: parsed.showMinorGrid ?? DEFAULT_ASSEMBLY_SETTINGS.showMinorGrid,
      gridInterval: clampPatternGridInterval(
        typeof parsed.gridInterval === "number" ? parsed.gridInterval : Number.NaN,
        DEFAULT_ASSEMBLY_SETTINGS.gridInterval
      ),
      gridColor: sanitizePatternGridColor(parsed.gridColor, DEFAULT_ASSEMBLY_SETTINGS.gridColor),
      showAxis: parsed.showAxis ?? DEFAULT_ASSEMBLY_SETTINGS.showAxis,
      showColorCode: parsed.showColorCode ?? DEFAULT_ASSEMBLY_SETTINGS.showColorCode,
      excludedColorCodes: Array.isArray(parsed.excludedColorCodes) ? parsed.excludedColorCodes : [],
      mirrorFlip: parsed.mirrorFlip ?? DEFAULT_ASSEMBLY_SETTINGS.mirrorFlip,
    };
  } catch {
    return DEFAULT_ASSEMBLY_SETTINGS;
  }
}

function rgba(color: string, alpha: number) {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function clampPreviewScale(scale: number) {
  return Math.min(PREVIEW_MAX_SCALE, Math.max(PREVIEW_MIN_SCALE, Number(scale.toFixed(2))));
}

function getTouchDistance(touches: TouchEvent<HTMLDivElement>["touches"]) {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchMidpoint(touches: TouchEvent<HTMLDivElement>["touches"]) {
  if (touches.length < 2) return { x: 0, y: 0 };
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

function renderAssemblyPreview({
  pixels,
  width,
  height,
  activeColor,
  activeLabel,
  showGrid,
  showMinorGrid,
  gridInterval,
  gridColor,
  showAxis,
  showColorCode,
  excludedColorCodes,
  mirrorFlip,
}: {
  pixels: Record<string, string>;
  width: number;
  height: number;
  activeColor: string | null;
  activeLabel: string | null;
  showGrid: boolean;
  showMinorGrid: boolean;
  gridInterval: number;
  gridColor: string;
  showAxis: boolean;
  showColorCode: boolean;
  excludedColorCodes: Set<string>;
  mirrorFlip: boolean;
}): RenderResult | null {
  if (typeof document === "undefined") return null;

  const axisSize = showAxis ? ASSEMBLY_AXIS_SIZE : 0;
  const cellSize = Math.max(
    ASSEMBLY_MIN_CELL_SIZE,
    Math.min(
      ASSEMBLY_PREVIEW_CELL_SIZE,
      Math.floor((ASSEMBLY_MAX_EDGE - axisSize * 2) / Math.max(width, height, 1))
    )
  );
  const contentWidth = width * cellSize;
  const contentHeight = height * cellSize;
  const canvas = document.createElement("canvas");
  canvas.width = contentWidth + axisSize * 2;
  canvas.height = contentHeight + axisSize * 2;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const offsetX = axisSize;
  const offsetY = axisSize;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.imageSmoothingEnabled = false;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? CHECKER_LIGHT : CHECKER_DARK;
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  const normalizedActiveColor = activeColor ? normalizeHex(activeColor) : null;
  for (const [key, color] of Object.entries(pixels)) {
    const [x, y] = key.split(",").map(Number);
    if (Number.isNaN(x) || Number.isNaN(y)) continue;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const drawX = mirrorFlip ? width - 1 - x : x;

    if (normalizedActiveColor && normalizeHex(color) === normalizedActiveColor) {
      ctx.fillStyle = ACTIVE_OUTLINE;
      ctx.globalAlpha = 0.16;
      ctx.fillRect(drawX * cellSize, y * cellSize, cellSize, cellSize);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ACTIVE_OUTLINE;
      ctx.lineWidth = Math.max(2, Math.floor(cellSize * 0.18));
      ctx.strokeRect(drawX * cellSize + 1, y * cellSize + 1, Math.max(1, cellSize - 2), Math.max(1, cellSize - 2));
    } else {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.22;
      ctx.fillRect(drawX * cellSize, y * cellSize, cellSize, cellSize);
      ctx.globalAlpha = 1;
    }
  }

  if (
    showColorCode &&
    normalizedActiveColor &&
    !excludedColorCodes.has(normalizedActiveColor) &&
    activeLabel &&
    cellSize >= 20
  ) {
    ctx.save();
    ctx.font = `700 ${Math.max(9, Math.min(14, Math.floor(cellSize / Math.max(activeLabel.length * 0.62, 2.8))))}px Geist, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(15, 23, 42, 0.68)";
    for (const [key, color] of Object.entries(pixels)) {
      if (normalizeHex(color) !== normalizedActiveColor) continue;
      const [x, y] = key.split(",").map(Number);
      if (Number.isNaN(x) || Number.isNaN(y)) continue;
      const drawX = mirrorFlip ? width - 1 - x : x;
      ctx.fillText(activeLabel, drawX * cellSize + cellSize / 2, y * cellSize + cellSize / 2);
    }
    ctx.restore();
  }

  if (showGrid) {
    if (showMinorGrid) {
      ctx.strokeStyle = rgba(gridColor, 0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x++) {
        const px = x * cellSize + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, contentHeight);
      }
      for (let y = 0; y <= height; y++) {
        const py = y * cellSize + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(contentWidth, py);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = rgba(gridColor, 0.78);
    ctx.lineWidth = Math.max(1.5, Math.floor(cellSize * 0.08));
    ctx.beginPath();
    for (let x = 0; x <= width; x += gridInterval) {
      const px = x * cellSize + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, contentHeight);
    }
    if (width % gridInterval !== 0) {
      ctx.moveTo(contentWidth + 0.5, 0);
      ctx.lineTo(contentWidth + 0.5, contentHeight);
    }
    for (let y = 0; y <= height; y += gridInterval) {
      const py = y * cellSize + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(contentWidth, py);
    }
    if (height % gridInterval !== 0) {
      ctx.moveTo(0, contentHeight + 0.5);
      ctx.lineTo(contentWidth, contentHeight + 0.5);
    }
    ctx.stroke();
  } else {
    ctx.strokeStyle = "rgba(15,23,42,0.16)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, contentWidth - 1, contentHeight - 1);
  }

  if (showAxis && cellSize >= 12) {
    ctx.save();
    ctx.fillStyle = AXIS_TEXT_COLOR;
    ctx.font = `600 ${Math.max(10, Math.floor(cellSize * 0.32))}px Geist, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let x = 0; x < width; x += gridInterval) {
      const sourceX = mirrorFlip ? width - x : x + 1;
      ctx.fillText(String(sourceX), x * cellSize + cellSize / 2, -14);
    }
    if ((width - 1) % gridInterval !== 0) {
      ctx.fillText(String(mirrorFlip ? 1 : width), contentWidth - cellSize / 2, -14);
    }

    ctx.textAlign = "right";
    for (let y = 0; y < height; y += gridInterval) {
      ctx.fillText(String(y + 1), -8, y * cellSize + cellSize / 2);
    }
    if ((height - 1) % gridInterval !== 0) {
      ctx.fillText(String(height), -8, contentHeight - cellSize / 2);
    }
    ctx.restore();
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(17, 24, 39, 0.35)";
  ctx.strokeRect(0, 0, contentWidth, contentHeight);
  ctx.restore();

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
  };
}

export default function AssemblyDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const pixels = useEditorStore((state) => state.pixels);
  const width = useEditorStore((state) => state.width);
  const height = useEditorStore((state) => state.height);
  const currentPaletteId = usePaletteStore((state) => state.currentPaletteId);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [completedColors, setCompletedColors] = useState<Set<string>>(() => new Set());
  const currentPalette = useMemo(() => getSystemPalette(currentPaletteId), [currentPaletteId]);
  const nearWhiteSwatches = useMemo<PaletteSwatch[]>(() => getNearWhiteSwatches(currentPalette), [currentPalette]);
  const persistedSettings = useMemo(() => loadAssemblySettings(), []);
  const [showGrid, setShowGrid] = useState(persistedSettings.showGrid);
  const [showMinorGrid, setShowMinorGrid] = useState(persistedSettings.showMinorGrid);
  const [gridInterval, setGridInterval] = useState(persistedSettings.gridInterval);
  const [draftGridInterval, setDraftGridInterval] = useState([persistedSettings.gridInterval]);
  const [gridColor, setGridColor] = useState(persistedSettings.gridColor);
  const [showAxis, setShowAxis] = useState(persistedSettings.showAxis);
  const [showColorCode, setShowColorCode] = useState(persistedSettings.showColorCode);
  const [excludedColorCodes, setExcludedColorCodes] = useState<Set<string>>(
    () => new Set(persistedSettings.excludedColorCodes.map(normalizeHex))
  );
  const [mirrorFlip, setMirrorFlip] = useState(persistedSettings.mirrorFlip);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
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
  const previewDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offset: { x: number; y: number };
  } | null>(null);

  const steps = useMemo<AssemblyStep[]>(() => {
    const usage = new Map<string, number>();
    for (const color of Object.values(pixels)) {
      const normalizedColor = normalizeHex(color);
      usage.set(normalizedColor, (usage.get(normalizedColor) ?? 0) + 1);
    }

    const palette = getSystemPalette(currentPaletteId);
    const paletteLabels = new Map(
      palette?.swatches.map((swatch) => [normalizeHex(swatch.color), swatch.label]) ?? []
    );

    return Array.from(usage.entries())
      .map(([color, count], index) => ({
        color,
        count,
        label: paletteLabels.get(color) ?? getFallbackLabel(index),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [currentPaletteId, pixels]);

  const clampedActiveIndex = Math.min(activeIndex, Math.max(steps.length - 1, 0));
  const activeStep = steps[clampedActiveIndex] ?? null;
  const progress = steps.length === 0 ? 0 : Math.round((completedColors.size / steps.length) * 100);
  const excludedColorCodeList = useMemo(() => Array.from(excludedColorCodes), [excludedColorCodes]);
  const previewResult = useMemo(
    () =>
      steps.length === 0
        ? null
        : renderAssemblyPreview({
            pixels,
            width,
            height,
            activeColor: activeStep?.color ?? null,
            activeLabel: activeStep?.label ?? null,
            showGrid,
            showMinorGrid,
            gridInterval,
            gridColor,
            showAxis,
            showColorCode,
            excludedColorCodes,
            mirrorFlip,
          }),
    [
      activeStep?.color,
      activeStep?.label,
      excludedColorCodes,
      gridColor,
      gridInterval,
      height,
      mirrorFlip,
      pixels,
      showAxis,
      showColorCode,
      showGrid,
      showMinorGrid,
      steps.length,
      width,
    ]
  );

  useEffect(() => {
    if (!open) return;
    const defaultColor = nearWhiteSwatches[0]?.color;
    queueMicrotask(() => {
      setExcludedColorCodes((current) => {
        if (current.size > 0) return current;
        return defaultColor ? new Set([normalizeHex(defaultColor)]) : new Set();
      });
    });
  }, [nearWhiteSwatches, open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      ASSEMBLY_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        showGrid,
        showMinorGrid,
        gridInterval,
        gridColor,
        showAxis,
        showColorCode,
        excludedColorCodes: excludedColorCodeList,
        mirrorFlip,
      } satisfies AssemblySettings)
    );
  }, [excludedColorCodeList, gridColor, gridInterval, mirrorFlip, showAxis, showColorCode, showGrid, showMinorGrid]);

  useEffect(() => {
    previewScaleRef.current = previewScale;
  }, [previewScale]);

  useEffect(() => {
    previewOffsetRef.current = previewOffset;
  }, [previewOffset]);

  const resetPreviewTransform = () => {
    previewScaleRef.current = 1;
    previewOffsetRef.current = { x: 0, y: 0 };
    setPreviewScale(1);
    setPreviewOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => resetPreviewTransform());
  }, [open, previewResult?.dataUrl]);

  const goToStep = (direction: -1 | 1) => {
    setActiveIndex(() => Math.min(Math.max(clampedActiveIndex + direction, 0), Math.max(steps.length - 1, 0)));
  };

  const markComplete = () => {
    if (!activeStep) return;
    setCompletedColors((current) => {
      const next = new Set(current);
      next.add(activeStep.color);
      return next;
    });
    setActiveIndex(() => Math.min(clampedActiveIndex + 1, Math.max(steps.length - 1, 0)));
  };

  const handleToggleExcludedColor = (color: string) => {
    const key = normalizeHex(color);
    setExcludedColorCodes((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleGridIntervalChange = (value: number[]) => {
    setDraftGridInterval(value);
  };

  const handleGridIntervalCommit = (value: number[]) => {
    const nextValue = value[0] ?? gridInterval;
    setDraftGridInterval([nextValue]);
    setGridInterval(nextValue);
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

  const stopPreviewDrag = () => {
    previewDragRef.current = null;
    setIsDragging(false);
  };

  const handlePreviewPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!previewResult) return;
    if (event.pointerType !== "mouse") return;
    if (event.button !== 0) return;
    if (event.target instanceof HTMLElement && event.target.closest("button")) return;

    previewDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offset: previewOffsetRef.current,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePreviewPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = previewDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const nextOffset = {
      x: drag.offset.x + (event.clientX - drag.startX),
      y: drag.offset.y + (event.clientY - drag.startY),
    };

    previewOffsetRef.current = nextOffset;
    setPreviewOffset(nextOffset);
  };

  const handlePreviewPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = previewDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stopPreviewDrag();
  };

  const handlePreviewPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    const drag = previewDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    stopPreviewDrag();
  };

  const handlePreviewTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!previewResult) return;
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
    if (!previewResult) return;
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

    const handleNativeWheel = (event: WheelEvent) => {
      if (!previewResult) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.ctrlKey || event.metaKey || isLikelyMouseWheel(event)) {
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

    const handleDocumentWheel = (event: WheelEvent) => {
      if (!previewResult) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!element.contains(target)) return;

      event.preventDefault();
      event.stopPropagation();
      if (event.ctrlKey || event.metaKey || isLikelyMouseWheel(event)) {
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
      if (!previewResult) return;
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
  }, [open, previewResult, previewViewportElement]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[100dvh] w-screen max-w-none translate-x-[-50%] translate-y-[-50%] gap-0 overflow-hidden rounded-none border-0 bg-background p-0 shadow-none"
        onOpenAutoFocus={() => {
          setActiveIndex(0);
          setCompletedColors(new Set());
          setSettingsOpen(false);
        }}
      >
        <DialogTitle className="sr-only">{t("editor.assembly.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("editor.assembly.description")}</DialogDescription>

        <div className="grid h-full grid-rows-[72px_1fr_70px] bg-slate-50">
          <header className="grid grid-cols-[96px_1fr_96px] items-center border-b bg-background px-5">
            <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-10 justify-self-start rounded-xl",
                    settingsOpen && "bg-amber-400 text-foreground hover:bg-amber-400/90"
                  )}
                >
                  <SlidersHorizontal className="size-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                portalled={false}
                align="start"
                side="bottom"
                sideOffset={14}
                className="w-[308px] gap-0 rounded-2xl border border-border/60 p-0 shadow-xl"
              >
                <div className="space-y-4 p-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Settings</h3>

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

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Color Code</h3>

                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <Label className="text-[11px] font-semibold">{t("editor.exportDialog.showColorCode")}</Label>
                        <div className="text-[10px] text-muted-foreground">
                          {t("editor.assembly.showColorCodeHint")}
                        </div>
                      </div>
                      <Switch
                        checked={showColorCode}
                        onCheckedChange={setShowColorCode}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className={cn("text-[11px] font-semibold", !showColorCode && "text-muted-foreground")}>
                        {t("editor.exportDialog.excludeColors")}
                      </Label>
                      <div className={cn("grid grid-cols-6 gap-2", !showColorCode && "pointer-events-none opacity-50")}>
                        {nearWhiteSwatches.map((swatch) => {
                          const key = normalizeHex(swatch.color);
                          const isSelected = excludedColorCodes.has(key);
                          return (
                            <button
                              key={`${swatch.label}-${key}`}
                              type="button"
                              onClick={() => handleToggleExcludedColor(swatch.color)}
                              className="group relative flex flex-col items-center gap-1 p-0.5 transition-transform hover:scale-105 active:scale-95"
                            >
                              <div
                                className={cn(
                                  "relative flex h-9 w-9 items-center justify-center rounded-md border-2 transition-shadow",
                                  isSelected ? "border-primary" : "border-gray-400/20"
                                )}
                                style={{ backgroundColor: swatch.color }}
                              >
                                <span
                                  className={cn(
                                    "text-[8px] font-bold transition-colors",
                                    isDarkColor(swatch.color) ? "text-white" : "text-black/60"
                                  )}
                                >
                                  {swatch.label}
                                </span>
                                {isSelected && (
                                  <div className="absolute -right-0.5 -top-0.5 flex size-3 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                                    <Check className="size-2" />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
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
                          {draftGridInterval[0]}
                        </span>
                      </div>
                      <Slider
                        value={draftGridInterval}
                        onValueChange={handleGridIntervalChange}
                        onValueCommit={handleGridIntervalCommit}
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
                      <div className={cn("grid grid-cols-6 gap-2", !showGrid && "pointer-events-none opacity-50")}>
                        {PATTERN_GRID_COLORS.map((color) => {
                          const selected = color.toLowerCase() === gridColor.toLowerCase();
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setGridColor(color)}
                              className="group relative flex flex-col items-center gap-1 p-0.5 transition-transform hover:scale-105 active:scale-95"
                              aria-label={color}
                            >
                              <div
                                className={cn(
                                  "relative flex h-9 w-9 items-center justify-center rounded-md border-2 transition-shadow",
                                  selected ? "border-primary" : "border-gray-400/20"
                                )}
                                style={{ backgroundColor: color }}
                              >
                                {selected && (
                                  <div className="absolute -right-0.5 -top-0.5 flex size-3 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                                    <Check className="size-2" />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <div className="mx-auto w-full max-w-[608px] space-y-1.5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{t("editor.assembly.progress")}</span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-sky-500 transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="size-10 justify-self-end rounded-full">
                <X className="size-5" />
              </Button>
            </DialogClose>
          </header>

          <main className="relative min-h-0 overflow-hidden">
            {steps.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                {t("editor.assembly.empty")}
              </div>
            ) : (
              <div
                ref={(node) => {
                  previewViewportRef.current = node;
                  setPreviewViewportElement(node);
                }}
                className="relative flex h-full w-full items-center justify-center overflow-hidden overscroll-contain bg-[linear-gradient(45deg,#f5f5f5_25%,transparent_25%,transparent_75%,#f5f5f5_75%,#f5f5f5),linear-gradient(45deg,#f5f5f5_25%,transparent_25%,transparent_75%,#f5f5f5_75%,#f5f5f5)] bg-[length:10px_10px] bg-[position:0_0,5px_5px] bg-repeat [touch-action:pan-y] md:[touch-action:none]"
                onTouchStart={handlePreviewTouchStart}
                onTouchMove={handlePreviewTouchMove}
                onTouchEnd={handlePreviewTouchEnd}
                onTouchCancel={handlePreviewTouchEnd}
                onPointerDown={handlePreviewPointerDown}
                onPointerMove={handlePreviewPointerMove}
                onPointerUp={handlePreviewPointerUp}
                onPointerCancel={handlePreviewPointerCancel}
                onLostPointerCapture={stopPreviewDrag}
                style={{ cursor: previewResult ? (isDragging ? "grabbing" : "grab") : "default" }}
              >
                {previewResult ? (
                  <div className="flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden p-3">
                    <img
                      src={previewResult.dataUrl}
                      alt={t("editor.assembly.title")}
                      className="max-h-full max-w-full rounded-xl object-contain border border-black/10 shadow-[0_12px_30px_rgba(15,23,42,0.12),0_2px_8px_rgba(15,23,42,0.08)] [image-rendering:pixelated]"
                      style={{
                        transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewScale})`,
                        transformOrigin: "center center",
                      }}
                    />
                  </div>
                ) : null}

                <div className="absolute top-3 right-3 flex items-center gap-1 rounded-xl border border-black/10 bg-background/92 p-1.5 shadow-sm backdrop-blur">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => stepPreviewScale(-PREVIEW_SCALE_STEP)}
                    disabled={!previewResult || previewScale <= PREVIEW_MIN_SCALE}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 min-w-14 rounded-lg px-2 text-xs font-semibold tabular-nums"
                    onClick={resetPreviewTransform}
                    disabled={!previewResult}
                  >
                    {Math.round(previewScale * 100)}%
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => stepPreviewScale(PREVIEW_SCALE_STEP)}
                    disabled={!previewResult || previewScale >= PREVIEW_MAX_SCALE}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </main>

          <footer className="grid grid-cols-[1fr_auto_1fr] items-center border-t bg-background/95 px-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur">
            <Button
              variant="outline"
              size="icon"
              className="size-12 justify-self-end rounded-lg"
              disabled={clampedActiveIndex === 0 || steps.length === 0}
              onClick={() => goToStep(-1)}
            >
              <ChevronLeft className="size-5" />
            </Button>

            <div className="mx-8 flex min-w-0 items-center gap-6">
              <div className="flex min-w-[150px] items-center gap-3">
                <span
                  className="size-10 shrink-0 rounded-full border shadow-sm"
                  style={{ backgroundColor: activeStep?.color ?? "transparent" }}
                />
                <span className="min-w-0">
                  <span className="block text-xl font-bold leading-5 text-foreground">
                    {activeStep?.label ?? "--"}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {activeStep ? t("editor.assembly.beadCount", { count: activeStep.count }) : t("editor.assembly.noStep")}
                  </span>
                </span>
              </div>

              <Button
                className={cn(
                  "h-11 min-w-[202px] rounded-md bg-pink-600 px-5 text-base font-semibold text-white shadow-sm hover:bg-pink-600/90",
                  activeStep && completedColors.has(activeStep.color) && "bg-emerald-600 hover:bg-emerald-600/90"
                )}
                disabled={!activeStep}
                onClick={markComplete}
              >
                <Check className="size-5" />
                {activeStep && completedColors.has(activeStep.color)
                  ? t("editor.assembly.completed")
                  : t("editor.assembly.markComplete")}
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="size-12 justify-self-start rounded-lg"
              disabled={clampedActiveIndex >= steps.length - 1 || steps.length === 0}
              onClick={() => goToStep(1)}
            >
              <ChevronRight className="size-5" />
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
