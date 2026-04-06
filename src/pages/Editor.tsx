import { useState, useEffect, useRef } from "react";
import PixelCanvas from "@/components/editor/PixelCanvas";
import PalettePanel from "@/components/palette/PalettePanel";
import { PANEL_CONFIG } from "@/lib/constants";

export default function Editor() {
  const [paletteHeight, setPaletteHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(PANEL_CONFIG.STORAGE_KEY);
      return saved ? parseInt(saved, 10) : PANEL_CONFIG.DEFAULT_HEIGHT;
    }
    return PANEL_CONFIG.DEFAULT_HEIGHT;
  });
  const isResizing = useRef(false);
  const lastTouchY = useRef(0);
  const handleMouseMoveRef = useRef<((e: MouseEvent) => void) | null>(null);
  const handleMouseUpRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    localStorage.setItem(PANEL_CONFIG.STORAGE_KEY, paletteHeight.toString());
  }, [paletteHeight]);

  useEffect(() => {
    handleMouseMoveRef.current = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= PANEL_CONFIG.MIN_HEIGHT && newHeight <= PANEL_CONFIG.MAX_HEIGHT) {
        setPaletteHeight(newHeight);
      }
    };

    handleMouseUpRef.current = () => {
      isResizing.current = false;
      if (handleMouseMoveRef.current) {
        document.removeEventListener("mousemove", handleMouseMoveRef.current);
      }
      if (handleMouseUpRef.current) {
        document.removeEventListener("mouseup", handleMouseUpRef.current);
      }
    };
  }, []);

  const handleMouseDown = () => {
    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMoveRef.current!);
    document.addEventListener("mouseup", handleMouseUpRef.current!);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isResizing.current = true;
    lastTouchY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isResizing.current) return;
    const currentY = e.touches[0].clientY;
    const deltaY = lastTouchY.current - currentY;
    lastTouchY.current = currentY;
    
    setPaletteHeight((prev) => {
      const newHeight = prev + deltaY;
      if (newHeight >= PANEL_CONFIG.MIN_HEIGHT && newHeight <= PANEL_CONFIG.MAX_HEIGHT) {
        return newHeight;
      }
      return prev;
    });
  };

  const handleTouchEnd = () => {
    isResizing.current = false;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative overflow-hidden">
        <PixelCanvas />
      </div>
      
      <div 
        className="h-2 sm:h-1 w-full cursor-ns-resize hover:bg-pink-500/50 active:bg-pink-500 transition-colors z-10 touch-none select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      <div style={{ height: `${paletteHeight}px` }} className="shrink-0 overflow-hidden bg-background">
        <PalettePanel />
      </div>
    </div>
  );
}
