'use client';

import { useState, useCallback, useMemo } from 'react';

export interface UseMapGesturesOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  initialZoom?: number;
  initialPan?: { x: number; y: number };
  onActionTriggered?: (action: 'zoom_in' | 'zoom_out' | 'fullscreen' | 'close') => void;
}

export function clampZoom(zoom: number, minZoom = 0.5, maxZoom = 3.0): number {
  const clamped = Math.min(maxZoom, Math.max(minZoom, zoom));
  return Math.round(clamped * 100) / 100;
}

export function calculateTouchDistance(
  p1: { clientX: number; clientY: number },
  p2: { clientX: number; clientY: number }
): number {
  return Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
}

export function calculatePinchZoom(
  initialZoom: number,
  initialDist: number,
  currentDist: number,
  minZoom = 0.5,
  maxZoom = 3.0
): number {
  if (initialDist <= 0) return initialZoom;
  const factor = currentDist / initialDist;
  return clampZoom(initialZoom * factor, minZoom, maxZoom);
}

export interface UseMapGesturesReturn {
  zoomLevel: number;
  pan: { x: number; y: number };
  isDragging: boolean;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleSetZoom: (level: number) => void;
  handleResetZoomPan: () => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleMouseLeave: () => void;
  handleWheel: (e: React.WheelEvent) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  handleTouchCancel: () => void;
  transformStyle: {
    transform: string;
    transition: string;
    cursor: string;
  };
}

const DEFAULT_PAN = { x: 0, y: 0 };

export function useMapGestures(options: UseMapGesturesOptions = {}): UseMapGesturesReturn {
  const {
    minZoom = 0.5,
    maxZoom = 3.0,
    zoomStep = 0.25,
    initialZoom = 1.0,
    initialPan = DEFAULT_PAN,
    onActionTriggered,
  } = options;

  const [zoomLevel, setZoomLevel] = useState<number>(initialZoom);
  const [pan, setPan] = useState<{ x: number; y: number }>(initialPan);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialPinchZoom, setInitialPinchZoom] = useState<number>(initialZoom);

  const handleResetZoomPan = useCallback(() => {
    setZoomLevel(initialZoom);
    setPan(initialPan);
    setIsDragging(false);
    setInitialPinchDistance(null);
  }, [initialZoom, initialPan]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((z) => clampZoom(z + zoomStep, minZoom, maxZoom));
    onActionTriggered?.('zoom_in');
  }, [zoomStep, minZoom, maxZoom, onActionTriggered]);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((z) => clampZoom(z - zoomStep, minZoom, maxZoom));
    onActionTriggered?.('zoom_out');
  }, [zoomStep, minZoom, maxZoom, onActionTriggered]);

  const handleSetZoom = useCallback(
    (level: number) => {
      setZoomLevel(clampZoom(level, minZoom, maxZoom));
    },
    [minZoom, maxZoom]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan.x, pan.y]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart.x, dragStart.y]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault?.();
      const step = e.ctrlKey ? 0.05 : 0.15;
      const delta = e.deltaY < 0 ? step : -step;
      setZoomLevel((prev) => clampZoom(prev + delta, minZoom, maxZoom));
    },
    [minZoom, maxZoom]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - pan.x,
          y: e.touches[0].clientY - pan.y,
        });
      } else if (e.touches.length === 2) {
        setIsDragging(false);
        const dist = calculateTouchDistance(e.touches[0], e.touches[1]);
        setInitialPinchDistance(dist);
        setInitialPinchZoom(zoomLevel);
      }
    },
    [pan.x, pan.y, zoomLevel]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1 && isDragging) {
        setPan({
          x: e.touches[0].clientX - dragStart.x,
          y: e.touches[0].clientY - dragStart.y,
        });
      } else if (e.touches.length === 2 && initialPinchDistance !== null && initialPinchDistance > 0) {
        const currentDist = calculateTouchDistance(e.touches[0], e.touches[1]);
        const nextZoom = calculatePinchZoom(initialPinchZoom, initialPinchDistance, currentDist, minZoom, maxZoom);
        setZoomLevel(nextZoom);
      }
    },
    [isDragging, dragStart.x, dragStart.y, initialPinchDistance, initialPinchZoom, minZoom, maxZoom]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setInitialPinchDistance(null);
  }, []);

  const handleTouchCancel = useCallback(() => {
    setIsDragging(false);
    setInitialPinchDistance(null);
  }, []);

  const transformStyle = useMemo(
    () => ({
      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
      transition: isDragging ? 'none' : 'transform 100ms ease-out',
      cursor: isDragging ? 'grabbing' : 'grab',
    }),
    [pan.x, pan.y, zoomLevel, isDragging]
  );

  return {
    zoomLevel,
    pan,
    isDragging,
    setZoomLevel,
    setPan,
    setIsDragging,
    handleZoomIn,
    handleZoomOut,
    handleSetZoom,
    handleResetZoomPan,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    transformStyle,
  };
}
