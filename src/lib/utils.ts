import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { EDITOR_CONFIG } from "./constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeHex(hex: string) {
  return hex.trim().toUpperCase().replace(/^#/, "")
}

export function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex)
  if (normalized.length !== 6) return null

  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)

  if ([r, g, b].some(Number.isNaN)) return null
  return { r, g, b }
}

export function getRgbColorDistance(colorA: string, colorB: string) {
  const a = hexToRgb(colorA)
  const b = hexToRgb(colorB)
  if (!a || !b) return Number.POSITIVE_INFINITY

  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return dr * dr + dg * dg + db * db
}

export function hexLabel(hex: string) {
  const v = normalizeHex(hex)
  return v.startsWith("#") ? v.slice(1) : v
}

export function isDarkColor(hex: string): boolean {
  const rgb = hexToRgb(hex)
  if (!rgb) return false
  const { r, g, b } = rgb
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function clampZoom(value: number) {
  return clamp(value, EDITOR_CONFIG.MIN_ZOOM, EDITOR_CONFIG.MAX_ZOOM)
}

export function isLikelyMouseWheel(event: WheelEvent) {
  if (event.deltaMode !== 0) return true
  if (Math.abs(event.deltaX) > 0) return false

  const absDeltaY = Math.abs(event.deltaY)
  return Number.isInteger(event.deltaY) && absDeltaY >= 40
}

export function getLinePoints(x0: number, y0: number, x1: number, y1: number) {
  const points: { x: number; y: number }[] = []
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  while (true) {
    points.push({ x: x0, y: y0 })
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x0 += sx
    }
    if (e2 < dx) {
      err += dx
      y0 += sy
    }
  }
  return points
}
