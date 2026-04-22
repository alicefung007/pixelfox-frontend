import type { PaletteDefinition } from "@/lib/palettes/types";

// ===================== 1. Precomputed Constants =====================
const PI = Math.PI;
const PI180 = PI / 180;
const POW25_7 = Math.pow(25, 7);
const D65_Xn = 0.95047;
const D65_Yn = 1.0;
const D65_Zn = 1.08883;

// ===================== 2. Type Definitions =====================
export interface ColorMatchResult {
  imageData: ImageData;
  width: number;
  height: number;
  beadCount: number;
  paletteId: string;
}

export interface ConvertOptions {
  width?: number; // Target width in beads, default 50
  height?: number; // Target height in beads (if not set, derived from aspect ratio)
  poolSize?: number; // Pooling size, default 2
  ciede2000Threshold?: number; // Color merge threshold, default 5
  excludeColorCodes?: string[]; // Color codes to exclude
  bgColorTolerance?: number; // Background color tolerance, default 3
  bgOutputMode?: "TRANSPARENT" | "WHITE" | "BLACK"; // Background output mode
}

// ===================== 3. Color Conversion Functions =====================
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function rgbToLab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const rLin = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
  const gLin = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
  const bLin = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;

  const X = rLin * 0.4124564 + gLin * 0.3575761 + bLin * 0.1804375;
  const Y = rLin * 0.2126729 + gLin * 0.7151522 + bLin * 0.0721750;
  const Z = rLin * 0.0193339 + gLin * 0.1191920 + bLin * 0.9503041;

  const fx = X / D65_Xn > 0.008856 ? Math.cbrt(X / D65_Xn) : (7.787 * X / D65_Xn) + 16 / 116;
  const fy = Y / D65_Yn > 0.008856 ? Math.cbrt(Y / D65_Yn) : (7.787 * Y / D65_Yn) + 16 / 116;
  const fz = Z / D65_Zn > 0.008856 ? Math.cbrt(Z / D65_Zn) : (7.787 * Z / D65_Zn) + 16 / 116;

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

// CIEDE2000 color difference calculation
function getCIEDE2000(
  L1: number,
  a1: number,
  b1: number,
  L2: number,
  a2: number,
  b2: number
): number {
  const LMean = (L1 + L2) / 2;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const CMean = (C1 + C2) / 2;
  const CMean7 = Math.pow(CMean, 7);

  const G = 0.5 * (1 - Math.sqrt(CMean7 / (CMean7 + POW25_7)));
  const a1P = a1 * (1 + G);
  const a2P = a2 * (1 + G);

  const C1P = Math.sqrt(a1P * a1P + b1 * b1);
  const C2P = Math.sqrt(a2P * a2P + b2 * b2);
  const CMeanP = (C1P + C2P) / 2;

  let h1P = Math.atan2(b1, a1P) * 180 / PI;
  let h2P = Math.atan2(b2, a2P) * 180 / PI;
  h1P = h1P < 0 ? h1P + 360 : h1P;
  h2P = h2P < 0 ? h2P + 360 : h2P;

  const hDiff = Math.abs(h1P - h2P);
  let hMeanP = 0;
  if (C1P * C2P !== 0) {
    hMeanP = hDiff <= 180 ? (h1P + h2P) / 2 : (h1P + h2P + 360) / 2;
  }

  const hMeanRad1 = (hMeanP - 30) * PI180;
  const hMeanRad2 = 2 * hMeanP * PI180;
  const hMeanRad3 = (3 * hMeanP + 6) * PI180;
  const hMeanRad4 = (4 * hMeanP - 63) * PI180;
  const T =
    1 -
    0.17 * Math.cos(hMeanRad1) +
    0.24 * Math.cos(hMeanRad2) +
    0.32 * Math.cos(hMeanRad3) -
    0.2 * Math.cos(hMeanRad4);

  const hDiffP = hDiff <= 180 ? h2P - h1P : (h2P - h1P + 360) % 360;
  const dL = L2 - L1;
  const dC = C2P - C1P;
  const dH = 2 * Math.sqrt(C1P * C2P) * Math.sin((hDiffP * PI180) / 2);

  const SL = 1 + (0.015 * Math.pow(LMean - 50, 2)) / Math.sqrt(20 + Math.pow(LMean - 50, 2));
  const SC = 1 + 0.045 * CMeanP;
  const SH = 1 + 0.015 * CMeanP * T;

  const RT = -2 * Math.sqrt(CMean7 / (CMean7 + POW25_7)) * Math.sin((60 * Math.exp(-Math.pow((hMeanP - 275) / 25, 2))) * PI180);

  return Math.sqrt(
    Math.pow(dL / SL, 2) + Math.pow(dC / SC, 2) + Math.pow(dH / SH, 2) + RT * (dC / SC) * (dH / SH)
  );
}

// ===================== 4. K-d Tree Build & Search =====================
interface KdNode {
  point: [number, number, number];
  index: number;
  left?: KdNode;
  right?: KdNode;
}

interface PaletteBead {
  r: number;
  g: number;
  b: number;
  hex: string;
  label: string;
  lab: { L: number; a: number; b: number };
  index: number;
}

function buildKdTree(
  points: { lab: { L: number; a: number; b: number }; index: number }[],
  depth: number = 0
): KdNode | undefined {
  if (points.length === 0) return undefined;

  const axis = depth % 3;
  points.sort((a, b) => {
    if (axis === 0) return a.lab.L - b.lab.L;
    if (axis === 1) return a.lab.a - b.lab.a;
    return a.lab.b - b.lab.b;
  });

  const mid = Math.floor(points.length / 2);
  const node: KdNode = {
    point: [points[mid].lab.L, points[mid].lab.a, points[mid].lab.b],
    index: points[mid].index,
  };
  node.left = buildKdTree(points.slice(0, mid), depth + 1);
  node.right = buildKdTree(points.slice(mid + 1), depth + 1);
  return node;
}

function findNearestKdTree(
  root: KdNode | undefined,
  target: [number, number, number],
  excludeSet: Set<number>,
  depth: number = 0,
  best: { distance: number; index: number } = { distance: Infinity, index: 0 }
): { distance: number; index: number } {
  if (!root) return best;

  const axis = depth % 3;
  const [tL, ta, tb] = target;
  const [nL, na, nb] = root.point;

  const distance = getCIEDE2000(tL, ta, tb, nL, na, nb);
  if (distance < best.distance && !excludeSet.has(root.index)) {
    best.distance = distance;
    best.index = root.index;
  }

  const diff = axis === 0 ? tL - nL : axis === 1 ? ta - na : tb - nb;
  const nearBranch = diff < 0 ? root.left : root.right;
  const farBranch = diff < 0 ? root.right : root.left;

  findNearestKdTree(nearBranch, target, excludeSet, depth + 1, best);
  if (Math.abs(diff) < best.distance) {
    findNearestKdTree(farBranch, target, excludeSet, depth + 1, best);
  }

  return best;
}

// ===================== 5. Core Conversion Logic =====================
export function createColorMatcher(palette: PaletteDefinition) {
  // Build bead palette from palette definition
  const beadPalette: PaletteBead[] = palette.swatches.map((swatch, index) => {
    const { r, g, b } = hexToRgb(swatch.color);
    const lab = rgbToLab(r, g, b);
    return {
      r,
      g,
      b,
      hex: swatch.color,
      label: swatch.label,
      lab: { L: lab.L, a: lab.a, b: lab.b },
      index,
    };
  });

  // Label to index mapping
  const labelToIndex = new Map(beadPalette.map((bead) => [bead.label, bead.index]));

  // Build k-d tree
  const kdTreeRoot = buildKdTree(
    beadPalette.map((bead) => ({ lab: bead.lab, index: bead.index }))
  );

  // Find nearest color (simplified, no background removal)
  function findNearestColor(
    r: number,
    g: number,
    b: number,
    excludeSet: Set<number> = new Set()
  ): PaletteBead {
    const lab = rgbToLab(r, g, b);
    const labTuple: [number, number, number] = [lab.L, lab.a, lab.b];
    const { index } = findNearestKdTree(kdTreeRoot, labTuple, excludeSet);
    return beadPalette[index];
  }

  return {
    beadPalette,
    labelToIndex,
    findNearestColor,
  };
}

export async function convertImageToPixelArt(
  imageSource: string | HTMLImageElement,
  palette: PaletteDefinition,
  options: ConvertOptions = {}
): Promise<ColorMatchResult> {
  const {
    width = 50,
    height,
    poolSize = 2,
    ciede2000Threshold = 5,
    excludeColorCodes = [],
    // bgColorTolerance = 3,
    // bgOutputMode = "WHITE",
  } = options;

  // Load image
  let img: HTMLImageElement;
  if (typeof imageSource === "string") {
    img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = imageSource;
    });
  } else {
    img = imageSource;
  }

  // Create canvas and draw resized image
  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;

  // Calculate target dimensions, maintaining aspect ratio if height not specified
  const dstWidth = Math.max(1, Math.floor(width));
  const dstHeight = height !== undefined
    ? Math.max(1, Math.floor(height))
    : Math.max(1, Math.floor(width * (srcHeight / srcWidth)));

  // Apply pooling
  const pooledWidth = Math.floor(dstWidth / poolSize);
  const pooledHeight = Math.floor(dstHeight / poolSize);

  const canvas = document.createElement("canvas");
  canvas.width = dstWidth;
  canvas.height = dstHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, dstWidth, dstHeight);

  const srcImageData = ctx.getImageData(0, 0, dstWidth, dstHeight);

  // Create color matcher
  const { beadPalette, findNearestColor } = createColorMatcher(palette);

  // Handle excluded colors
  const excludeSet = new Set<number>();
  excludeColorCodes.forEach((code) => {
    const idx = labelToIndexMap(beadPalette, code);
    if (idx !== undefined) excludeSet.add(idx);
  });

  // Perform color matching
  const resultCanvas = document.createElement("canvas");
  resultCanvas.width = pooledWidth;
  resultCanvas.height = pooledHeight;
  const resultCtx = resultCanvas.getContext("2d")!;
  const resultImageData = resultCtx.createImageData(pooledWidth, pooledHeight);

  // First pass: match colors
  for (let py = 0; py < pooledHeight; py++) {
    for (let px = 0; px < pooledWidth; px++) {
      // Collect pixels in window
      const pixels: { r: number; g: number; b: number }[] = [];

      for (let wy = 0; wy < poolSize; wy++) {
        for (let wx = 0; wx < poolSize; wx++) {
          const sx = px * poolSize + wx;
          const sy = py * poolSize + wy;
          if (sx < dstWidth && sy < dstHeight) {
            const srcOffset = (sy * dstWidth + sx) * 4;
            pixels.push({
              r: srcImageData.data[srcOffset],
              g: srcImageData.data[srcOffset + 1],
              b: srcImageData.data[srcOffset + 2],
            });
          }
        }
      }

      // Get most common color
      const colorCounts = new Map<string, number>();
      for (const p of pixels) {
        const key = `${p.r},${p.g},${p.b}`;
        colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
      }

      let targetR = 0,
        targetG = 0,
        targetB = 0;
      let maxCount = 0;
      colorCounts.forEach((count, key) => {
        if (count > maxCount) {
          maxCount = count;
          [targetR, targetG, targetB] = key.split(",").map(Number);
        }
      });

      // Match to nearest color
      const matchedBead = findNearestColor(targetR, targetG, targetB, excludeSet);

      // Write result
      const resultOffset = (py * pooledWidth + px) * 4;
      resultImageData.data[resultOffset] = matchedBead.r;
      resultImageData.data[resultOffset + 1] = matchedBead.g;
      resultImageData.data[resultOffset + 2] = matchedBead.b;
      resultImageData.data[resultOffset + 3] = 255;
    }
  }

  // Second pass: region merging using BFS
  if (ciede2000Threshold > 0) {
    const visited = new Uint8Array(pooledWidth * pooledHeight);
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (let i = 0; i < pooledWidth * pooledHeight; i++) {
      if (visited[i]) continue;

      // BFS to find connected region
      const queue: number[] = [i];
      const region: number[] = [];
      visited[i] = 1;
      region.push(i);

      const baseOffset = i * 4;
      const baseLab = rgbToLab(
        resultImageData.data[baseOffset],
        resultImageData.data[baseOffset + 1],
        resultImageData.data[baseOffset + 2]
      );

      let head = 0;
      while (head < queue.length) {
        const currIdx = queue[head++];
        const cx = currIdx % pooledWidth;
        const cy = Math.floor(currIdx / pooledWidth);

        for (const [dx, dy] of directions) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= pooledWidth || ny < 0 || ny >= pooledHeight) continue;

          const neighborIdx = ny * pooledWidth + nx;
          if (visited[neighborIdx]) continue;

          const neighborOffset = neighborIdx * 4;
          const neighborLab = rgbToLab(
            resultImageData.data[neighborOffset],
            resultImageData.data[neighborOffset + 1],
            resultImageData.data[neighborOffset + 2]
          );

          const distance = getCIEDE2000(baseLab.L, baseLab.a, baseLab.b, neighborLab.L, neighborLab.a, neighborLab.b);
          if (distance < ciede2000Threshold) {
            visited[neighborIdx] = 1;
            queue.push(neighborIdx);
            region.push(neighborIdx);
          }
        }
      }

      // Find most common color in region
      const regionColorCounts = new Map<string, number>();
      for (const idx of region) {
        const offset = idx * 4;
        const key = `${resultImageData.data[offset]},${resultImageData.data[offset + 1]},${resultImageData.data[offset + 2]}`;
        regionColorCounts.set(key, (regionColorCounts.get(key) || 0) + 1);
      }

      let maxCount = 0;
      let dominantColor = "";
      regionColorCounts.forEach((count, key) => {
        if (count > maxCount) {
          maxCount = count;
          dominantColor = key;
        }
      });

      // Apply dominant color to all pixels in region
      const [dr, dg, db] = dominantColor.split(",").map(Number);
      for (const idx of region) {
        const offset = idx * 4;
        resultImageData.data[offset] = dr;
        resultImageData.data[offset + 1] = dg;
        resultImageData.data[offset + 2] = db;
      }
    }
  }

  resultCtx.putImageData(resultImageData, 0, 0);

  const beadCount = pooledWidth * pooledHeight;

  return {
    imageData: resultImageData,
    width: pooledWidth,
    height: pooledHeight,
    beadCount,
    paletteId: palette.id,
  };
}

// Helper function: label to index mapping
function labelToIndexMap(beadPalette: PaletteBead[], label: string): number | undefined {
  for (let i = 0; i < beadPalette.length; i++) {
    if (beadPalette[i].label === label) return i;
  }
  return undefined;
}

// Simplified version: returns ImageData URL directly
export async function convertImageToDataURL(
  imageSource: string | HTMLImageElement,
  palette: PaletteDefinition,
  options: ConvertOptions = {}
): Promise<string> {
  const result = await convertImageToPixelArt(imageSource, palette, options);
  const canvas = document.createElement("canvas");
  canvas.width = result.width;
  canvas.height = result.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(result.imageData, 0, 0);
  return canvas.toDataURL("image/png");
}