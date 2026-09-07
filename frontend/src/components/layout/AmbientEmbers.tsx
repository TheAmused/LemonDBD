'use client';
// frontend/src/components/layout/AmbientEmbers.tsx

import React, { useEffect, useRef, useState } from 'react';

interface Ember {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  alpha: number;
}

interface AmbientEmbersProps {
  /** A small background touch for every page -- noticeably present, but
   * still well short of the randomizer's old standalone effect. */
  count?: number;
  className?: string;
}

/**
 * Sitewide, low-density ember field (small circles drifting slowly
 * upward) rendered once in PageShell so every page gets the same subtle
 * atmosphere instead of it being a one-off confined to the randomizer's
 * stage box. Color follows the active theme's --accent-amber token so it
 * still reads correctly across light/light-lemon/dark.
 */
export const AmbientEmbers: React.FC<AmbientEmbersProps> = ({ count = 20, className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const readAccentColor = () =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent-amber').trim() || '#f59e0b';
    let color = readAccentColor();
    const themeObserver = new MutationObserver(() => {
      color = readAccentColor();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let animationFrameId: number;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const embers: Ember[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speedY: -(Math.random() * 0.25 + 0.08),
      speedX: (Math.random() - 0.5) * 0.18,
      alpha: Math.random() * 0.22 + 0.08,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (const e of embers) {
        e.y += e.speedY;
        e.x += e.speedX;
        if (e.y < 0) {
          e.y = height;
          e.x = Math.random() * width;
        }
        ctx.save();
        ctx.globalAlpha = e.alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      themeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [count, reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ?? 'pointer-events-none fixed inset-0 z-0 h-full w-full'}
    />
  );
};
