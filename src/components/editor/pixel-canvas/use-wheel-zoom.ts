import React, { useEffect } from 'react';
import { clampZoom, isLikelyMouseWheel } from '@/lib/utils';
import { EDITOR_CONFIG } from '@/lib/constants';

export function useWheelZoom(params: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoomRef: React.MutableRefObject<number>;
  viewOffsetRef: React.MutableRefObject<{ x: number; y: number }>;
  setZoom: (z: number) => void;
  setViewOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setIsAutoZoom: (auto: boolean) => void;
}) {
  const { containerRef, zoomRef, viewOffsetRef, setZoom, setViewOffset, setIsAutoZoom } = params;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Wheel input zooms around the pointer for mouse wheels, and pans for trackpad scroll.
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setIsAutoZoom(false);

      if (e.ctrlKey || e.metaKey || isLikelyMouseWheel(e)) {
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomNow = zoomRef.current;
        const offsetNow = viewOffsetRef.current;
        const scale = zoomNow / 10;
        const worldX = (mouseX - offsetNow.x) / scale;
        const worldY = (mouseY - offsetNow.y) / scale;

        const factor = Math.exp(-e.deltaY / 80);
        const nextZoom = clampZoom(Math.round(zoomNow * factor));
        if (nextZoom === zoomNow) return;

        const nextScale = nextZoom / 10;
        setZoom(nextZoom);
        setViewOffset({
          x: mouseX - worldX * nextScale,
          y: mouseY - worldY * nextScale,
        });
        return;
      }

      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === 1) {
        dx *= 16;
        dy *= 16;
      } else if (e.deltaMode === 2) {
        dx *= container.clientWidth;
        dy *= container.clientHeight;
      }

      const panSpeed = EDITOR_CONFIG.PAN_SPEED;
      setViewOffset(prev => ({ x: prev.x - dx * panSpeed, y: prev.y - dy * panSpeed }));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef, zoomRef, viewOffsetRef, setZoom, setViewOffset, setIsAutoZoom]);
}
