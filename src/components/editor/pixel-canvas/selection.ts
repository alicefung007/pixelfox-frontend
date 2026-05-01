import { SELECTION_CONFIG } from "@/lib/constants"
import { normalizeHex } from "@/lib/utils"

export const COLOR_NEIGHBOR_OFFSETS: ReadonlyArray<readonly [number, number]> =
  // Shared by bucket fill and wand selection; switch between 4-way and 8-way connectivity.
  SELECTION_CONFIG.COLOR_CONNECTIVITY === 8
    ? [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]
    : [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]

type PixelSearchParams = {
  startX: number
  startY: number
  width: number
  height: number
  pixels: Record<string, string>
}

type ContiguousColorParams = PixelSearchParams & {
  targetColor: string
}

export const getContiguousColorKeys = ({
  startX,
  startY,
  targetColor,
  width,
  height,
  pixels,
}: ContiguousColorParams) => {
  const normalizedTargetColor = normalizeHex(targetColor)
  const queue: [number, number][] = [[startX, startY]]
  const visited = new Set<string>()
  const selectedKeys: string[] = []

  while (queue.length > 0) {
    const [x, y] = queue.shift()!
    const key = `${x},${y}`

    // Flood-search only through existing pixels that match the normalized target color.
    if (x < 0 || x >= width || y < 0 || y >= height) continue
    if (visited.has(key)) continue
    visited.add(key)

    const currentColor = pixels[key]
    if (!currentColor || normalizeHex(currentColor) !== normalizedTargetColor)
      continue

    selectedKeys.push(key)
    for (const [offsetX, offsetY] of COLOR_NEIGHBOR_OFFSETS) {
      queue.push([x + offsetX, y + offsetY])
    }
  }

  return selectedKeys
}

type FloodFillParams = PixelSearchParams & {
  targetColor: string | null
  replacementColor: string
}

export const floodFillPixels = ({
  startX,
  startY,
  targetColor,
  replacementColor,
  width,
  height,
  pixels,
}: FloodFillParams) => {
  if (targetColor === replacementColor) return null

  // Bucket fill uses the configured connectivity and works across empty pixels when targetColor is null.
  const newPixels = { ...pixels }
  const queue: [number, number][] = [[startX, startY]]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const [x, y] = queue.shift()!
    const key = `${x},${y}`

    if (x < 0 || x >= width || y < 0 || y >= height) continue
    if (visited.has(key)) continue

    const currentColor = pixels[key] ?? null
    if (currentColor !== targetColor) continue

    visited.add(key)
    newPixels[key] = replacementColor

    for (const [offsetX, offsetY] of COLOR_NEIGHBOR_OFFSETS) {
      queue.push([x + offsetX, y + offsetY])
    }
  }

  return newPixels
}
