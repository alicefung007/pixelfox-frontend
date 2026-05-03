import React, { useEffect, useRef, useState } from "react"
import type { CursorOverlayState } from "./types"

export function useCursorOverlay(
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const [cursorOverlay, setCursorOverlay] = useState<CursorOverlayState>({
    x: 0,
    y: 0,
    visible: false,
  })
  const cursorRafRef = useRef<number | null>(null)
  const cursorPendingRef = useRef<CursorOverlayState>(cursorOverlay)

  useEffect(() => {
    cursorPendingRef.current = cursorOverlay
  }, [cursorOverlay])

  useEffect(() => {
    return () => {
      if (cursorRafRef.current !== null)
        cancelAnimationFrame(cursorRafRef.current)
    }
  }, [])

  const queueCursorOverlay = (next: CursorOverlayState) => {
    cursorPendingRef.current = next
    if (cursorRafRef.current !== null) return

    // Coalesce cursor overlay updates to one React state update per frame.
    cursorRafRef.current = requestAnimationFrame(() => {
      cursorRafRef.current = null
      setCursorOverlay(cursorPendingRef.current)
    })
  }

  const updateCursorFromMouseEvent = (e: React.MouseEvent) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    queueCursorOverlay({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      visible: true,
    })
  }

  return {
    cursorOverlay,
    cursorPendingRef,
    queueCursorOverlay,
    updateCursorFromMouseEvent,
  }
}
