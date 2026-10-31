// frontend/src/components/smash-or-pass/InteractiveDragBackground.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { createScene, drawScene, spawnActionBurst, updateIntensities, type DragAction, type DragState } from './dragBackgroundScene';

interface InteractiveDragBackgroundProps {
  dragX?: number; // < 0 is Pass (left), > 0 is Smash (right)
  dragY?: number; // < 0 is Super Smash (up)
  isDragging?: boolean;
  actionTrigger?: DragAction | null;
  triggerKey?: number;
  isPaused?: boolean;
  showEmbers?: boolean;
}

export const InteractiveDragBackground: React.FC<InteractiveDragBackgroundProps> = ({
  dragX = 0,
  dragY = 0,
  isDragging = false,
  actionTrigger = null,
  triggerKey = 0,
  isPaused = false,
  showEmbers = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // References to keep smooth animation state across renders
  const stateRef = useRef<DragState>({
    dragX: 0,
    dragY: 0,
    isDragging: false,
    smashIntensity: 0,
    passIntensity: 0,
    superIntensity: 0,
    actionTrigger: null,
    triggerKey: 0,
    isPaused: false,
    showEmbers: true,
  });

  const isLoopActiveRef = useRef(false);
  const kickRenderRef = useRef<() => void>(() => {});

  useEffect(() => {
    stateRef.current.dragX = dragX;
    stateRef.current.dragY = dragY;
    stateRef.current.isDragging = isDragging;
    stateRef.current.isPaused = isPaused;
    stateRef.current.showEmbers = showEmbers;
    if (!isPaused) {
      kickRenderRef.current();
    }
  }, [dragX, dragY, isDragging, isPaused, showEmbers]);

  useEffect(() => {
    stateRef.current.actionTrigger = actionTrigger;
    stateRef.current.triggerKey = triggerKey;
  }, [actionTrigger, triggerKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const scene = createScene(width, height);
    let lastHandledKey = 0;

    const render = () => {
      if (stateRef.current.isPaused) {
        isLoopActiveRef.current = false;
        return;
      }
      isLoopActiveRef.current = true;

      const curState = stateRef.current;
      updateIntensities(curState);
      if (curState.triggerKey !== lastHandledKey && curState.actionTrigger) {
        lastHandledKey = curState.triggerKey;
        spawnActionBurst(scene, curState.actionTrigger, width / 2, height / 2);
      }
      drawScene(ctx, scene, curState, width, height);

      animationFrameId = requestAnimationFrame(render);
    };

    kickRenderRef.current = () => {
      if (!isLoopActiveRef.current && !stateRef.current.isPaused) {
        isLoopActiveRef.current = true;
        animationFrameId = requestAnimationFrame(render);
      }
    };

    isLoopActiveRef.current = true;
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      isLoopActiveRef.current = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
};
