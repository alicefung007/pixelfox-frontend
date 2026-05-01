import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clampZoom } from '@/lib/utils';
import { EDITOR_CONFIG } from '@/lib/constants';

export function useViewport(params: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  width: number;
  height: number;
  zoom: number;
  setZoom: (z: number) => void;
}) {
  const { containerRef, width, height, zoom, setZoom } = params;

  const [isAutoZoom, setIsAutoZoom] = useState(true);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });

  const zoomRef = useRef(zoom);
  const viewOffsetRef = useRef(viewOffset);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    viewOffsetRef.current = viewOffset;
  }, [viewOffset]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Fit zoom is based on the current container size and pixel-art dimensions.
    const updateZoomToFit = () => {
      if (!isAutoZoom) return;
      if (container.offsetParent === null) return;
      if (container.clientWidth === 0 || container.clientHeight === 0) return;

      const availableWidth = container.clientWidth - EDITOR_CONFIG.AUTO_FIT_PADDING;
      const availableHeight = container.clientHeight - EDITOR_CONFIG.AUTO_FIT_PADDING;
      if (availableWidth <= 0 || availableHeight <= 0) return;

      const scaleX = availableWidth / width;
      const scaleY = availableHeight / height;
      const nextZoom = clampZoom(Math.floor(Math.min(scaleX, scaleY) * 10));
      setZoom(nextZoom);
    };

    const resizeObserver = new ResizeObserver(updateZoomToFit);
    resizeObserver.observe(container);

    updateZoomToFit();

    return () => resizeObserver.disconnect();
  }, [containerRef, width, height, setZoom, isAutoZoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateViewport = () => {
      setViewportSize({ width: container.clientWidth, height: container.clientHeight });
    };

    const resizeObserver = new ResizeObserver(updateViewport);
    resizeObserver.observe(container);
    updateViewport();
    return () => resizeObserver.disconnect();
  }, [containerRef]);

  useLayoutEffect(() => {
    if (!isAutoZoom) return;
    if (viewportSize.width === 0 || viewportSize.height === 0) return;

    // Keep the canvas centered after auto-fit recalculates zoom or viewport size changes.
    const scale = zoom / 10;
    const contentWidth = width * scale;
    const contentHeight = height * scale;
    const x = (viewportSize.width - contentWidth) / 2;
    const y = (viewportSize.height - contentHeight) / 2;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewOffset({ x, y });
  }, [isAutoZoom, viewportSize.width, viewportSize.height, zoom, width, height]);

  return {
    isAutoZoom,
    setIsAutoZoom,
    viewportSize,
    viewOffset,
    setViewOffset,
    zoomRef,
    viewOffsetRef,
  };
}
