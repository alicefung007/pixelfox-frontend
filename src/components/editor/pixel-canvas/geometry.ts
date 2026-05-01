import React from 'react';
import { normalizeHex } from '@/lib/utils';
import { COLOR_NEIGHBOR_OFFSETS } from './constants';

type Coords = { x: number; y: number };

export function getCoordinatesFromClient(
  canvas: HTMLCanvasElement | null,
  clientX: number,
  clientY: number,
  zoom: number,
  viewOffset: { x: number; y: number },
  width: number,
  height: number,
): Coords | null {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const viewX = clientX - rect.left;
  const viewY = clientY - rect.top;
  const scale = zoom / 10;
  // Convert viewport coordinates into pixel-art coordinates.
  const x = Math.floor((viewX - viewOffset.x) / scale);
  const y = Math.floor((viewY - viewOffset.y) / scale);
  if (x >= 0 && x < width && y >= 0 && y < height) {
    return { x, y };
  }
  return null;
}

export function getCoordinates(
  canvas: HTMLCanvasElement | null,
  e: React.MouseEvent,
  zoom: number,
  viewOffset: { x: number; y: number },
  width: number,
  height: number,
): Coords | null {
  return getCoordinatesFromClient(canvas, e.clientX, e.clientY, zoom, viewOffset, width, height);
}

export function getCoordinatesFromTouch(
  canvas: HTMLCanvasElement | null,
  e: React.TouchEvent,
  zoom: number,
  viewOffset: { x: number; y: number },
  width: number,
  height: number,
): Coords | null {
  return getCoordinatesFromClient(canvas, e.touches[0].clientX, e.touches[0].clientY, zoom, viewOffset, width, height);
}

export function getCanvasAnchorFromCoords(
  coords: Coords,
  zoom: number,
  viewOffset: { x: number; y: number },
) {
  const scale = zoom / 10;
  return {
    x: viewOffset.x + (coords.x + 0.5) * scale,
    y: viewOffset.y + (coords.y + 0.5) * scale,
  };
}

export function getContiguousColorKeys(
  pixels: Record<string, string>,
  width: number,
  height: number,
  startX: number,
  startY: number,
  targetColor: string,
): string[] {
  const normalizedTargetColor = normalizeHex(targetColor);
  const queue: [number, number][] = [[startX, startY]];
  const visited = new Set<string>();
  const selectedKeys: string[] = [];

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const key = `${x},${y}`;

    // Flood-search only through existing pixels that match the normalized target color.
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited.has(key)) continue;
    visited.add(key);

    const currentColor = pixels[key];
    if (!currentColor || normalizeHex(currentColor) !== normalizedTargetColor) continue;

    selectedKeys.push(key);
    for (const [offsetX, offsetY] of COLOR_NEIGHBOR_OFFSETS) {
      queue.push([x + offsetX, y + offsetY]);
    }
  }

  return selectedKeys;
}

export function computeFloodFill(
  pixels: Record<string, string>,
  width: number,
  height: number,
  startX: number,
  startY: number,
  targetColor: string | null,
  replacementColor: string,
): Record<string, string> | null {
  if (targetColor === replacementColor) return null;

  // Bucket fill uses the configured connectivity and works across empty pixels when targetColor is null.
  const newPixels = { ...pixels };
  const queue: [number, number][] = [[startX, startY]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const key = `${x},${y}`;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited.has(key)) continue;

    const currentColor = pixels[key] ?? null;
    if (currentColor !== targetColor) continue;

    visited.add(key);
    newPixels[key] = replacementColor;

    for (const [offsetX, offsetY] of COLOR_NEIGHBOR_OFFSETS) {
      queue.push([x + offsetX, y + offsetY]);
    }
  }

  return newPixels;
}
