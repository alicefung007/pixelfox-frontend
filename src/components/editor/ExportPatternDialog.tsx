import { type PointerEvent, type TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Download, Minus, X, Plus } from "lucide-react";
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
import {
  clampPatternGridInterval,
  getNearWhiteSwatches,
  PATTERN_GRID_COLORS,
  sanitizePatternGridColor,
} from "@/components/editor/pattern-dialog-shared";
import { getSystemPalette, type PaletteSwatch } from "@/lib/palettes";
import { createColorMatcher } from "@/lib/image-processor";
import { cn, hexToRgb, isDarkColor, isLikelyMouseWheel, normalizeHex } from "@/lib/utils";
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

type ColorUsageItem = {
  color: string;
  label: string;
  count: number;
};

type SummaryInfo = {
  paletteName: string;
  sizeText: string;
  beadCount: number;
  colorCountExcludingWhite: number;
};

type HeaderStat = {
  label: string;
  value: string;
};

type HeaderSummaryMetrics = {
  headerHeight: number;
  headerPaddingX: number;
  logoHeight: number;
  statLabelFont: string;
  statLabelFontSize: number;
  statValueFont: string;
  statValueFontSize: number;
  statLabelLineHeight: number;
  statValueLineHeight: number;
  statGapY: number;
  statColumnGap: number;
  statSeparatorHeight: number;
};

type ColorStatsMetrics = {
  paddingX: number;
  paddingY: number;
  gapX: number;
  gapY: number;
  badgeHeight: number;
  badgeRadius: number;
  dotSize: number;
  badgePaddingX: number;
  badgeMaxLabelWidth: number;
  labelFont: string;
  countFont: string;
  labelFontSize: number;
  countFontSize: number;
  countMinWidth: number;
  countPaddingX: number;
  countHeight: number;
  countRadius: number;
  labelGap: number;
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

const CELL_SIZE = 40;
const AXIS_SIZE = 40;
const BASE_BRAND_HEADER_PADDING_Y = 32;
const BASE_BRAND_HEADER_PADDING_X = 40;
const BASE_BRAND_LOGO_HEIGHT = 76;
const BASE_BRAND_STATS_LABEL_FONT_SIZE = 14;
const BASE_BRAND_STATS_VALUE_FONT_SIZE = 26;
const BASE_BRAND_STATS_SEPARATOR_HEIGHT = 60;
const MAX_EXPORT_EDGE = 122880;
const MAJOR_GRID_WIDTH = 2;
const MINOR_GRID_WIDTH = 2;
const BASE_COLOR_STATS_PADDING_X = 18;
const BASE_COLOR_STATS_PADDING_Y = 18;
const BASE_COLOR_STATS_GAP_X = 16;
const BASE_COLOR_STATS_GAP_Y = 16;
const BASE_COLOR_STATS_SUMMARY_GAP_Y = 8;
const BASE_COLOR_STATS_SUMMARY_LINE_HEIGHT = 28;
const BASE_COLOR_STATS_SUMMARY_ITEM_GAP = 24;
const BASE_COLOR_STATS_BADGE_HEIGHT = 28;
const BASE_COLOR_STATS_BADGE_RADIUS = 8;
const BASE_COLOR_STATS_BADGE_DOT_SIZE = 12;
const BASE_COLOR_STATS_BADGE_PADDING_X = 12;
const BASE_COLOR_STATS_BADGE_MAX_LABEL_WIDTH = 120;
const BASE_COLOR_STATS_LABEL_FONT_SIZE = 12;
const BASE_COLOR_STATS_COUNT_FONT_SIZE = 11;
const BASE_COLOR_STATS_COUNT_MIN_WIDTH = 24;
const BASE_COLOR_STATS_COUNT_PADDING_X = 7;
const BASE_COLOR_STATS_COUNT_HEIGHT = 20;
const BASE_COLOR_STATS_COUNT_RADIUS = 10;
const BASE_COLOR_STATS_LABEL_GAP = 8;
const PREVIEW_MIN_SCALE = 0.5;
const PREVIEW_MAX_SCALE = 10;
const PREVIEW_SCALE_STEP = 0.12;
const PREVIEW_PAN_SPEED = 1;
const EXPORT_DIALOG_SETTINGS_STORAGE_KEY = "pixelfox-export-dialog-settings";
const BRAND_LOGO_SRC = "/logo_with_name.png";
const BRAND_COMPACT_LOGO_SRC = "/logo.png";
const BRAND_BUILDER_LABEL = "BUILDER";
const BRAND_DOMAIN_TEXT = "pixelfox.art";
const HEADER_SCALE_BASE_WIDTH = 30;
const EXPORT_CORNER_RADIUS = 20;
const EXPORT_BORDER_WIDTH = 1;
const EXPORT_BORDER_COLOR = "rgba(0, 0, 0, 0.1)";
const DEFAULT_EXPORT_DIALOG_SETTINGS: ExportDialogSettings = {
  autoCrop: true,
  whiteBackground: true,
  showGrid: true,
  showMinorGrid: true,
  gridInterval: 5,
  gridColor: PATTERN_GRID_COLORS[0],
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

    return {
      autoCrop: parsed.autoCrop ?? DEFAULT_EXPORT_DIALOG_SETTINGS.autoCrop,
      whiteBackground: parsed.whiteBackground ?? DEFAULT_EXPORT_DIALOG_SETTINGS.whiteBackground,
      showGrid: parsed.showGrid ?? DEFAULT_EXPORT_DIALOG_SETTINGS.showGrid,
      showMinorGrid: parsed.showMinorGrid ?? DEFAULT_EXPORT_DIALOG_SETTINGS.showMinorGrid,
      gridInterval: clampPatternGridInterval(
        typeof parsed.gridInterval === "number" ? parsed.gridInterval : Number.NaN,
        DEFAULT_EXPORT_DIALOG_SETTINGS.gridInterval
      ),
      gridColor: sanitizePatternGridColor(parsed.gridColor, DEFAULT_EXPORT_DIALOG_SETTINGS.gridColor),
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

function clipRoundedCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  radius: number
) {
  const roundedRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, roundedRadius);
  ctx.clip();
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

function getColorUsage(
  pixels: Record<string, string>,
  paletteLabels: Map<string, string>,
  excludedColorCodes: Set<string>
): ColorUsageItem[] {
  const usageMap = new Map<string, number>();

  Object.values(pixels).forEach((color) => {
    const normalized = normalizeHex(color);
    if (!normalized) return;
    if (excludedColorCodes.has(normalized)) return;
    usageMap.set(normalized, (usageMap.get(normalized) ?? 0) + 1);
  });

  return Array.from(usageMap.entries())
    .map(([color, count]) => ({
      color: `#${color}`,
      label: paletteLabels.get(color) ?? `#${color.toUpperCase()}`,
      count,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });
}

function fitTextToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;

  const ellipsis = "…";
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}${ellipsis}`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}${ellipsis}`;
}

function isWhiteLikeColor(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  return rgb.r >= 245 && rgb.g >= 245 && rgb.b >= 245;
}

function getHeaderSummaryMetrics(downloadWidth: number): HeaderSummaryMetrics {
  const scale = Math.max(downloadWidth, 1) / HEADER_SCALE_BASE_WIDTH;
  const statLabelFontSize = Math.max(9, Math.round(BASE_BRAND_STATS_LABEL_FONT_SIZE * scale));
  const statValueFontSize = Math.max(15, Math.round(BASE_BRAND_STATS_VALUE_FONT_SIZE * scale));
  const logoHeight = Math.max(24, Math.round(BASE_BRAND_LOGO_HEIGHT * scale));
  const statLabelLineHeight = Math.max(18, Math.round(BASE_COLOR_STATS_SUMMARY_LINE_HEIGHT * scale));
  const statValueLineHeight = Math.max(24, Math.round(statValueFontSize * 1.12));
  const statGapY = Math.max(4, Math.round(BASE_COLOR_STATS_SUMMARY_GAP_Y * scale));
  const headerContentHeight = Math.max(logoHeight, statLabelLineHeight + statGapY + statValueLineHeight);
  const verticalPaddingScale = 0.72 + Math.min(0.42, Math.sqrt(Math.max(downloadWidth, 1) / HEADER_SCALE_BASE_WIDTH) * 0.28);
  const horizontalPaddingScale = 0.78 + Math.min(0.34, Math.sqrt(Math.max(downloadWidth, 1) / HEADER_SCALE_BASE_WIDTH) * 0.22);
  const headerPaddingY = Math.max(14, Math.round(BASE_BRAND_HEADER_PADDING_Y * scale * verticalPaddingScale));
  const headerPaddingX = Math.max(18, Math.round(BASE_BRAND_HEADER_PADDING_X * scale * horizontalPaddingScale));

  return {
    headerHeight: Math.max(72, headerContentHeight + headerPaddingY * 2),
    headerPaddingX,
    logoHeight,
    statLabelFont: `700 ${statLabelFontSize}px Geist, sans-serif`,
    statLabelFontSize,
    statValueFont: `700 ${statValueFontSize}px Geist, sans-serif`,
    statValueFontSize,
    statLabelLineHeight,
    statValueLineHeight,
    statGapY,
    statColumnGap: Math.max(12, Math.round(BASE_COLOR_STATS_SUMMARY_ITEM_GAP * scale)),
    statSeparatorHeight: Math.max(28, Math.round(BASE_BRAND_STATS_SEPARATOR_HEIGHT * scale)),
  };
}

function getColorStatsMetrics(downloadWidth: number): ColorStatsMetrics {
  const scale = Math.max(downloadWidth, 1) / HEADER_SCALE_BASE_WIDTH;
  const labelFontSize = Math.max(10, Math.round(BASE_COLOR_STATS_LABEL_FONT_SIZE * scale));
  const countFontSize = Math.max(9, Math.round(BASE_COLOR_STATS_COUNT_FONT_SIZE * scale));

  return {
    paddingX: Math.max(8, Math.round(BASE_COLOR_STATS_PADDING_X * scale)),
    paddingY: Math.max(8, Math.round(BASE_COLOR_STATS_PADDING_Y * scale)),
    gapX: Math.max(8, Math.round(BASE_COLOR_STATS_GAP_X * scale)),
    gapY: Math.max(8, Math.round(BASE_COLOR_STATS_GAP_Y * scale)),
    badgeHeight: Math.max(22, Math.round(BASE_COLOR_STATS_BADGE_HEIGHT * scale)),
    badgeRadius: Math.max(6, Math.round(BASE_COLOR_STATS_BADGE_RADIUS * scale)),
    dotSize: Math.max(8, Math.round(BASE_COLOR_STATS_BADGE_DOT_SIZE * scale)),
    badgePaddingX: Math.max(8, Math.round(BASE_COLOR_STATS_BADGE_PADDING_X * scale)),
    badgeMaxLabelWidth: Math.max(48, Math.round(BASE_COLOR_STATS_BADGE_MAX_LABEL_WIDTH * scale)),
    labelFont: `600 ${labelFontSize}px Geist, sans-serif`,
    countFont: `700 ${countFontSize}px Geist, sans-serif`,
    labelFontSize,
    countFontSize,
    countMinWidth: Math.max(18, Math.round(BASE_COLOR_STATS_COUNT_MIN_WIDTH * scale)),
    countPaddingX: Math.max(4, Math.round(BASE_COLOR_STATS_COUNT_PADDING_X * scale)),
    countHeight: Math.max(16, Math.round(BASE_COLOR_STATS_COUNT_HEIGHT * scale)),
    countRadius: Math.max(8, Math.round(BASE_COLOR_STATS_COUNT_RADIUS * scale)),
    labelGap: Math.max(4, Math.round(BASE_COLOR_STATS_LABEL_GAP * scale)),
  };
}

function drawBrandIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  logoImage: HTMLImageElement | null,
  metrics: HeaderSummaryMetrics
) {
  if (logoImage) {
    const aspectRatio = logoImage.naturalWidth / Math.max(logoImage.naturalHeight, 1);
    const width = metrics.logoHeight * aspectRatio;
    const previousImageSmoothingEnabled = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(logoImage, x, y, width, metrics.logoHeight);
    ctx.imageSmoothingEnabled = previousImageSmoothingEnabled;
    return;
  }

  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, metrics.logoHeight, metrics.logoHeight);
  ctx.restore();
}

function getBrandLogoWidth(logoImage: HTMLImageElement | null, metrics: HeaderSummaryMetrics) {
  if (!logoImage) return metrics.logoHeight;
  return metrics.logoHeight * (logoImage.naturalWidth / Math.max(logoImage.naturalHeight, 1));
}

function getHeaderStats(
  summary: SummaryInfo,
  labels: { palette: string; size: string; beadCount: string }
): HeaderStat[] {
  return [
    { label: labels.palette, value: summary.paletteName },
    { label: labels.size, value: summary.sizeText },
    { label: labels.beadCount, value: String(summary.beadCount) },
    { label: BRAND_BUILDER_LABEL, value: BRAND_DOMAIN_TEXT },
  ];
}

function getDisplayHeaderLabel(label: string) {
  const upperLabel = label.toLocaleUpperCase();
  if (!/^[A-Z ]+$/.test(upperLabel)) return upperLabel;
  return upperLabel
    .split(" ")
    .map((word) => word.split("").join(" "))
    .join("   ");
}

function drawHeaderStats(
  ctx: CanvasRenderingContext2D,
  stats: HeaderStat[],
  x: number,
  y: number,
  width: number,
  metrics: HeaderSummaryMetrics
) {
  if (stats.length === 0 || width <= 0) return;

  const gap = metrics.statColumnGap;
  const columnWidth = Math.max(1, (width - gap * (stats.length - 1)) / stats.length);
  const labelY = y + Math.max(0, (metrics.statLabelLineHeight - metrics.statLabelFontSize) / 2);
  const valueY =
    y +
    metrics.statLabelLineHeight +
    metrics.statGapY +
    Math.max(0, (metrics.statValueLineHeight - metrics.statValueFontSize) / 2);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  stats.forEach((stat, index) => {
    const columnX = x + index * (columnWidth + gap);
    const centerX = columnX + columnWidth / 2;
    const textMaxWidth = Math.max(8, columnWidth * 0.92);

    ctx.font = metrics.statLabelFont;
    ctx.fillStyle = "#746D68";
    ctx.fillText(fitTextToWidth(ctx, getDisplayHeaderLabel(stat.label), textMaxWidth), centerX, labelY);

    ctx.font = metrics.statValueFont;
    ctx.fillStyle = "#403C3B";
    ctx.fillText(fitTextToWidth(ctx, stat.value, textMaxWidth), centerX, valueY);

    if (index < stats.length - 1) {
      const separatorX = Math.round(columnX + columnWidth + gap / 2);
      const separatorY = Math.round(y + (metrics.statLabelLineHeight + metrics.statGapY) * 0.55);
      const separatorHeight = Math.min(
        metrics.statSeparatorHeight,
        metrics.statLabelLineHeight + metrics.statGapY + metrics.statValueLineHeight - (separatorY - y)
      );
      ctx.fillStyle = "rgba(116,109,104,0.24)";
      ctx.fillRect(separatorX, separatorY, 1, Math.max(1, Math.round(separatorHeight)));
    }
  });

  ctx.restore();
}

function createColorBadgeLayout(
  ctx: CanvasRenderingContext2D,
  items: ColorUsageItem[],
  totalWidth: number,
  metrics: ColorStatsMetrics,
  offsetY = 0
) {
  if (items.length === 0) {
    return { badges: [], height: offsetY > 0 ? metrics.paddingY * 2 + offsetY : 0 };
  }

  const contentWidth = Math.max(0, totalWidth - metrics.paddingX * 2);
  const minBadgeWidth = metrics.badgePaddingX * 2 + metrics.dotSize + metrics.countMinWidth;
  const preferredColumnWidth = Math.max(
    minBadgeWidth,
    metrics.badgePaddingX * 2 +
      metrics.dotSize +
      metrics.labelGap +
      Math.round(metrics.badgeMaxLabelWidth * 0.36) +
      metrics.labelGap +
      metrics.countMinWidth
  );
  const maxColumns = Math.max(
    1,
    Math.floor((contentWidth + metrics.gapX) / (preferredColumnWidth + metrics.gapX))
  );
  const columnWidth = Math.max(
    minBadgeWidth,
    Math.floor((contentWidth - metrics.gapX * (maxColumns - 1)) / maxColumns)
  );
  const badges: Array<{
    x: number;
    y: number;
    width: number;
    label: string;
    item: ColorUsageItem;
  }> = [];

  ctx.font = metrics.labelFont;
  items.forEach((item, index) => {
    const countText = String(item.count);
    ctx.font = metrics.countFont;
    const countWidth = Math.max(
      metrics.countMinWidth,
      Math.ceil(ctx.measureText(countText).width) + metrics.countPaddingX * 2
    );

    ctx.font = metrics.labelFont;
    const maxLabelWidth = Math.min(
      metrics.badgeMaxLabelWidth,
      Math.max(
        20,
        columnWidth - metrics.badgePaddingX * 2 - metrics.dotSize - countWidth - metrics.labelGap * 2
      )
    );
    const label = fitTextToWidth(ctx, item.label, maxLabelWidth);
    const columnIndex = index % maxColumns;
    const rowIndex = Math.floor(index / maxColumns);
    const x = metrics.paddingX + columnIndex * (columnWidth + metrics.gapX);
    const y = metrics.paddingY + offsetY + rowIndex * (metrics.badgeHeight + metrics.gapY);

    badges.push({ x, y, width: columnWidth, label, item });
  });

  const rowCount = Math.ceil(items.length / maxColumns);

  return {
    badges,
    height:
      metrics.paddingY * 2 +
      offsetY +
      rowCount * metrics.badgeHeight +
      Math.max(0, rowCount - 1) * metrics.gapY,
  };
}

function renderPatternImage(options: {
  pixels: Record<string, string>;
  width: number;
  height: number;
  paletteName: string;
  paletteLabels: Map<string, string>;
  autoCrop: boolean;
  whiteBackground: boolean;
  showGrid: boolean;
  showMinorGrid: boolean;
  gridInterval: number;
  gridColor: string;
  showAxis: boolean;
  showColorCode: boolean;
  excludedColorCodes: string[];
  mirrorFlip: boolean;
  summaryLabels: { palette: string; size: string; beadCount: string };
  logoImage: HTMLImageElement | null;
  compactLogoImage: HTMLImageElement | null;
}): RenderResult | null {
  if (typeof document === "undefined") return null;

  const themePrimaryColor =
    getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#F77C31";

  const {
    pixels,
    width,
    height,
    paletteName,
    paletteLabels,
    autoCrop,
    whiteBackground,
    showGrid,
    showMinorGrid,
    gridInterval,
    gridColor,
    showAxis,
    showColorCode,
    excludedColorCodes,
    mirrorFlip,
    summaryLabels,
    logoImage,
    compactLogoImage,
  } = options;
  const excludedColorCodeSet = new Set(excludedColorCodes.map(normalizeHex));

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
  const colorUsage = getColorUsage(pixels, paletteLabels, excludedColorCodeSet);
  const headerMetrics = getHeaderSummaryMetrics(cols);
  const colorStatsMetrics = getColorStatsMetrics(cols);
  const beadCount = colorUsage.reduce((sum, item) => sum + item.count, 0);
  const summaryInfo: SummaryInfo = {
    paletteName,
    sizeText: `${cols} × ${rows}`,
    beadCount,
    colorCountExcludingWhite: colorUsage.filter((item) => !isWhiteLikeColor(item.color)).length,
  };
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) return null;
  const brandImage = cols <= 10 ? compactLogoImage : logoImage;
  const brandLogoWidth = getBrandLogoWidth(brandImage, headerMetrics);
  const headerStats = getHeaderStats(summaryInfo, summaryLabels);
  const headerStatsGap = Math.max(20, Math.round(headerMetrics.headerPaddingX * 0.8));
  const getHeaderStatsBounds = (renderWidth: number) => ({
    x: headerMetrics.headerPaddingX + brandLogoWidth + headerStatsGap,
    width: Math.max(
      0,
      renderWidth - headerMetrics.headerPaddingX * 2 - brandLogoWidth - headerStatsGap
    ),
  });

  let cellSize = clampCellSize(CELL_SIZE, cols, rows, axisSize);
  let exportWidth = cols * cellSize + axisSize * 2;
  let colorStatsLayout = createColorBadgeLayout(measureCtx, colorUsage, exportWidth, colorStatsMetrics);

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const maxByHeight = Math.floor(
      (MAX_EXPORT_EDGE - headerMetrics.headerHeight - axisSize * 2 - colorStatsLayout.height) / Math.max(rows, 1)
    );
    const nextCellSize = Math.max(8, Math.min(cellSize, maxByHeight));
    if (nextCellSize === cellSize) break;

    cellSize = nextCellSize;
    exportWidth = cols * cellSize + axisSize * 2;
    colorStatsLayout = createColorBadgeLayout(measureCtx, colorUsage, exportWidth, colorStatsMetrics);
  }

  exportWidth = cols * cellSize + axisSize * 2;
  const gridHeight = rows * cellSize + axisSize * 2;
  const exportHeight = headerMetrics.headerHeight + gridHeight + colorStatsLayout.height;

  const canvas = document.createElement("canvas");
  canvas.width = exportWidth;
  canvas.height = exportHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  clipRoundedCanvas(ctx, exportWidth, exportHeight, EXPORT_CORNER_RADIUS);

  const gridOriginX = axisSize;
  const gridOriginY = headerMetrics.headerHeight + axisSize;
  const contentWidth = cols * cellSize;
  const contentHeight = rows * cellSize;
  const colorStatsTop = headerMetrics.headerHeight + gridHeight;

  if (whiteBackground) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, exportWidth, exportHeight);
  } else {
    ctx.clearRect(0, 0, exportWidth, exportHeight);
  }

  // Brand header
  ctx.fillStyle = whiteBackground ? "#F8FAFC" : "rgba(248,250,252,0.96)";
  ctx.fillRect(0, 0, exportWidth, headerMetrics.headerHeight);
  ctx.fillStyle = "rgba(148,163,184,0.2)";
  ctx.fillRect(0, headerMetrics.headerHeight - 1, exportWidth, 1);

  const brandIconY = (headerMetrics.headerHeight - headerMetrics.logoHeight) / 2;
  drawBrandIcon(ctx, headerMetrics.headerPaddingX, brandIconY, themePrimaryColor, brandImage, headerMetrics);

  const headerStatsBounds = getHeaderStatsBounds(exportWidth);
  const headerStatsHeight =
    headerMetrics.statLabelLineHeight +
    headerMetrics.statGapY +
    headerMetrics.statValueLineHeight;
  const headerStatsY = Math.max(0, Math.round((headerMetrics.headerHeight - headerStatsHeight) / 2));
  drawHeaderStats(
    ctx,
    headerStats,
    headerStatsBounds.x,
    headerStatsY,
    headerStatsBounds.width,
    headerMetrics
  );

  if (colorStatsLayout.height > 0) {
    ctx.fillStyle = whiteBackground ? "#F8FAFC" : "rgba(248,250,252,0.96)";
    ctx.fillRect(0, colorStatsTop, exportWidth, colorStatsLayout.height);
    ctx.fillStyle = "rgba(148,163,184,0.32)";
    ctx.fillRect(0, colorStatsTop, exportWidth, 1);
  }

  if (showAxis) {
    ctx.fillStyle = whiteBackground ? "#F8FAFC" : "rgba(248,250,252,0.96)";
    ctx.fillRect(0, headerMetrics.headerHeight, exportWidth, axisSize);
    ctx.fillRect(0, headerMetrics.headerHeight + gridHeight - axisSize, exportWidth, axisSize);
    ctx.fillRect(0, headerMetrics.headerHeight, axisSize, gridHeight);
    ctx.fillRect(exportWidth - axisSize, headerMetrics.headerHeight, axisSize, gridHeight);
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
        if (excludedColorCodeSet.has(normalized)) continue;
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
    ctx.fillStyle = "#94A3B8";
    ctx.font = `600 ${Math.max(12, Math.floor(axisSize * 0.52))}px Geist, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let col = 0; col < cols; col += 1) {
      const text = autoCrop
        ? String(col + 1)
        : String(mirrorFlip ? bounds.maxX - col + 1 : bounds.minX + col + 1);
      const x = gridOriginX + col * cellSize + cellSize / 2;
      ctx.fillText(text, x, headerMetrics.headerHeight + axisSize / 2);
      ctx.fillText(text, x, headerMetrics.headerHeight + gridHeight - axisSize / 2);
    }

    for (let row = 0; row < rows; row += 1) {
      const text = autoCrop ? String(row + 1) : String(bounds.minY + row + 1);
      const y = gridOriginY + row * cellSize + cellSize / 2;
      ctx.fillText(text, axisSize / 2, y);
      ctx.fillText(text, exportWidth - axisSize / 2, y);
    }
  }

  if (colorStatsLayout.badges.length > 0) {
    for (const badge of colorStatsLayout.badges) {
      const badgeX = badge.x;
      const badgeY = colorStatsTop + badge.y;
      const countText = String(badge.item.count);

      ctx.fillStyle = whiteBackground ? "#FFFFFF" : "rgba(255,255,255,0.88)";
      ctx.beginPath();
      ctx.roundRect(
        badgeX,
        badgeY,
        badge.width,
        colorStatsMetrics.badgeHeight,
        colorStatsMetrics.badgeRadius
      );
      ctx.fill();

      ctx.strokeStyle = "rgba(148,163,184,0.38)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const dotX = badgeX + colorStatsMetrics.badgePaddingX + colorStatsMetrics.dotSize / 2;
      const dotY = badgeY + colorStatsMetrics.badgeHeight / 2;
      ctx.fillStyle = badge.item.color;
      ctx.beginPath();
      ctx.arc(dotX, dotY, colorStatsMetrics.dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(15,23,42,0.12)";
      ctx.stroke();

      ctx.font = colorStatsMetrics.labelFont;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#0F172A";
      const labelX = badgeX + colorStatsMetrics.badgePaddingX + colorStatsMetrics.dotSize + colorStatsMetrics.labelGap;
      ctx.fillText(badge.label, labelX, badgeY + colorStatsMetrics.badgeHeight / 2);

      ctx.font = colorStatsMetrics.countFont;
      const countWidth = Math.max(
        colorStatsMetrics.countMinWidth,
        Math.ceil(ctx.measureText(countText).width) + colorStatsMetrics.countPaddingX * 2
      );
      const countX = badgeX + badge.width - colorStatsMetrics.badgePaddingX - countWidth;
      const countY = badgeY + (colorStatsMetrics.badgeHeight - colorStatsMetrics.countHeight) / 2;

      ctx.fillStyle = "rgba(226,232,240,0.96)";
      ctx.beginPath();
      ctx.roundRect(
        countX,
        countY,
        countWidth,
        colorStatsMetrics.countHeight,
        colorStatsMetrics.countRadius
      );
      ctx.fill();

      ctx.fillStyle = "#475569";
      ctx.textAlign = "center";
      ctx.fillText(countText, countX + countWidth / 2, badgeY + colorStatsMetrics.badgeHeight / 2 + 0.5);
    }
  }

  ctx.strokeStyle = EXPORT_BORDER_COLOR;
  ctx.lineWidth = EXPORT_BORDER_WIDTH;
  ctx.beginPath();
  ctx.roundRect(
    EXPORT_BORDER_WIDTH / 2,
    EXPORT_BORDER_WIDTH / 2,
    exportWidth - EXPORT_BORDER_WIDTH,
    exportHeight - EXPORT_BORDER_WIDTH,
    Math.max(0, EXPORT_CORNER_RADIUS - EXPORT_BORDER_WIDTH / 2)
  );
  ctx.stroke();

  ctx.restore();

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
  const currentPalette = useMemo(() => getSystemPalette(currentPaletteId), [currentPaletteId]);
  const nearWhiteSwatches = useMemo<PaletteSwatch[]>(() => getNearWhiteSwatches(currentPalette), [currentPalette]);
  const [persistedSettings, setPersistedSettings] = useState<ExportDialogSettings>(() => loadExportDialogSettings());
  const [autoCrop, setAutoCrop] = useState(persistedSettings.autoCrop);
  const [whiteBackground, setWhiteBackground] = useState(persistedSettings.whiteBackground);
  const [showGrid, setShowGrid] = useState(persistedSettings.showGrid);
  const [showMinorGrid, setShowMinorGrid] = useState(persistedSettings.showMinorGrid);
  const [gridInterval, setGridInterval] = useState(persistedSettings.gridInterval);
  const [draftGridInterval, setDraftGridInterval] = useState([persistedSettings.gridInterval]);
  const [gridColor, setGridColor] = useState(persistedSettings.gridColor);
  const [showAxis, setShowAxis] = useState(persistedSettings.showAxis);
  const [showColorCode, setShowColorCode] = useState(persistedSettings.showColorCode);
  const [excludedColorCodes, setExcludedColorCodes] = useState<Set<string>>(() => new Set());
  const [mirrorFlip, setMirrorFlip] = useState(persistedSettings.mirrorFlip);
  const [brandLogoImage, setBrandLogoImage] = useState<HTMLImageElement | null>(null);
  const [brandCompactLogoImage, setBrandCompactLogoImage] = useState<HTMLImageElement | null>(null);
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

  useEffect(() => {
    if (!open) return;
    const defaultColor = nearWhiteSwatches[0]?.color;
    queueMicrotask(() => {
      setExcludedColorCodes(defaultColor ? new Set([normalizeHex(defaultColor)]) : new Set());
    });
  }, [open, currentPaletteId, nearWhiteSwatches]);

  const excludedColorCodeList = useMemo(() => Array.from(excludedColorCodes), [excludedColorCodes]);

  const handleToggleExcludedColor = (color: string) => {
    const key = normalizeHex(color);
    setExcludedColorCodes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const previewDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offset: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    previewScaleRef.current = previewScale;
  }, [previewScale]);

  useEffect(() => {
    previewOffsetRef.current = previewOffset;
  }, [previewOffset]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    queueMicrotask(() => setBrandLogoImage(null));
    queueMicrotask(() => setBrandCompactLogoImage(null));
    const image = new window.Image();
    const compactImage = new window.Image();
    image.onload = () => setBrandLogoImage(image);
    compactImage.onload = () => setBrandCompactLogoImage(compactImage);
    image.src = BRAND_LOGO_SRC;
    compactImage.src = BRAND_COMPACT_LOGO_SRC;

    if (image.complete && image.naturalWidth > 0) {
      queueMicrotask(() => setBrandLogoImage(image));
    }
    if (compactImage.complete && compactImage.naturalWidth > 0) {
      queueMicrotask(() => setBrandCompactLogoImage(compactImage));
    }

    return () => {
      image.onload = null;
      compactImage.onload = null;
    };
  }, []);

  useEffect(() => {
    const nextSettings: ExportDialogSettings = {
      autoCrop,
      whiteBackground,
      showGrid,
      showMinorGrid,
      gridInterval,
      gridColor,
      showAxis,
      showColorCode,
      mirrorFlip,
    };

    queueMicrotask(() =>
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
      })
    );
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
    const palette = currentPalette;
    if (!palette) return new Map<string, string>();

    const matcher = createColorMatcher(palette);
    const resolved = new Map<string, string>();
    const uniqueColors = new Set(Object.values(pixels).map((color) => normalizeHex(color)));

    uniqueColors.forEach((color) => {
      const rgb = hexToRgb(color);
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
  }, [currentPalette, pixels]);

  const paletteDisplayName = currentPalette
    ? currentPalette.i18nKey
      ? t(currentPalette.i18nKey)
      : currentPalette.name
    : currentPaletteId;

  const exportResult = useMemo(
    () =>
      renderPatternImage({
        pixels,
        width,
        height,
        paletteName: paletteDisplayName,
        paletteLabels,
        autoCrop,
        whiteBackground,
        showGrid,
        showMinorGrid,
        gridInterval,
        gridColor,
        showAxis,
        showColorCode,
        excludedColorCodes: excludedColorCodeList,
        mirrorFlip,
        logoImage: brandLogoImage,
        compactLogoImage: brandCompactLogoImage,
        summaryLabels: {
          palette: t("editor.exportDialog.summaryPalette"),
          size: t("editor.exportDialog.summarySize"),
          beadCount: t("editor.exportDialog.summaryBeadCount"),
        },
      }),
    [
      pixels,
      width,
      height,
      paletteDisplayName,
      paletteLabels,
      autoCrop,
      whiteBackground,
      showGrid,
      showMinorGrid,
      gridInterval,
      gridColor,
      showAxis,
      showColorCode,
      excludedColorCodeList,
      mirrorFlip,
      brandLogoImage,
      brandCompactLogoImage,
      t,
    ]
  );

  function resetPreviewTransform() {
    previewScaleRef.current = 1;
    previewOffsetRef.current = { x: 0, y: 0 };
    setPreviewScale(1);
    setPreviewOffset({ x: 0, y: 0 });
  }

  const handleGridIntervalChange = (value: number[]) => {
    setDraftGridInterval(value);
  };

  const handleGridIntervalCommit = (value: number[]) => {
    const nextValue = value[0] ?? gridInterval;
    setDraftGridInterval([nextValue]);
    setGridInterval(nextValue);
  };

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => resetPreviewTransform());
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

  const stopPreviewDrag = () => {
    previewDragRef.current = null;
    setIsDragging(false);
  };

  const handlePreviewPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!exportResult) return;
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

    const handleDocumentWheel = (event: globalThis.WheelEvent) => {
      if (!exportResult) return;
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
          <div className="w-full md:w-[260px] md:shrink-0 space-y-3 md:space-y-4 order-2 md:order-none">
            <div className="space-y-4 pt-3">
              <h3 className="text-sm font-semibold">{t("editor.exportDialog.sectionSettings")}</h3>

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
              <h3 className="text-sm font-semibold">{t("editor.exportDialog.sectionColor")}</h3>

              <div className="flex items-center justify-between gap-3">
                <Label className="text-[11px] font-semibold">{t("editor.exportDialog.showColorCode")}</Label>
                <Switch
                  checked={showColorCode}
                  onCheckedChange={setShowColorCode}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-semibold">
                  {t("editor.exportDialog.excludeColors")}
                </Label>
                <div className="grid grid-cols-6 gap-2">
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

            <Separator className="shrink-0" />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t("editor.exportDialog.sectionGrid")}</h3>

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
                <div className={cn("grid grid-cols-6 gap-2", !showGrid && "opacity-50 pointer-events-none")}>
                  {PATTERN_GRID_COLORS.map((c) => {
                    const selected = c.toLowerCase() === gridColor.toLowerCase();
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setGridColor(c)}
                        className="group relative flex flex-col items-center gap-1 p-0.5 transition-transform hover:scale-105 active:scale-95"
                        aria-label={c}
                      >
                        <div
                          className={cn(
                            "relative flex h-9 w-9 items-center justify-center rounded-md border-2 transition-shadow",
                            selected ? "border-primary" : "border-gray-400/20"
                          )}
                          style={{ backgroundColor: c }}
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

          <div className="flex-1 min-w-0 pb-3 md:pb-4 md:flex md:flex-col md:self-stretch order-1 md:order-none">
            <div className="pt-3 pb-4 flex items-baseline gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">{t("editor.exportDialog.preview")}</h3>
              <span className="text-xs text-muted-foreground">({t("editor.exportDialog.previewHint")})</span>
            </div>

            <div
              ref={(node) => {
                previewViewportRef.current = node;
                setPreviewViewportElement(node);
              }}
              className="relative rounded-xl border overflow-hidden overscroll-contain flex items-center justify-center min-h-[420px] md:min-h-0 md:flex-1 bg-[linear-gradient(45deg,#f5f5f5_25%,transparent_25%,transparent_75%,#f5f5f5_75%,#f5f5f5),linear-gradient(45deg,#f5f5f5_25%,transparent_25%,transparent_75%,#f5f5f5_75%,#f5f5f5)] bg-[length:10px_10px] bg-[position:0_0,5px_5px] bg-repeat [touch-action:pan-y] md:[touch-action:none]"
              onTouchStart={handlePreviewTouchStart}
              onTouchMove={handlePreviewTouchMove}
              onTouchEnd={handlePreviewTouchEnd}
              onTouchCancel={handlePreviewTouchEnd}
              onPointerDown={handlePreviewPointerDown}
              onPointerMove={handlePreviewPointerMove}
              onPointerUp={handlePreviewPointerUp}
              onPointerCancel={handlePreviewPointerCancel}
              onLostPointerCapture={stopPreviewDrag}
              style={{ cursor: exportResult ? (isDragging ? "grabbing" : "grab") : "default" }}
            >
              {exportResult ? (
                <div className="flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden p-3">
                  <img
                    src={exportResult.dataUrl}
                    alt={t("editor.exportDialog.previewTitle")}
                    className="max-h-full max-w-full rounded-xl object-contain mx-auto border border-black/10 shadow-[0_12px_30px_rgba(15,23,42,0.12),0_2px_8px_rgba(15,23,42,0.08)]"
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
