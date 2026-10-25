// frontend/src/components/common/CampfireParticles.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { paletteColor } from '@/utils/themeColor';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  alpha: number;
  baseAlpha: number;
  color: string;
  wobbleSpeed: number;
  wobbleAmp: number;
  wobblePhase: number;
}

export interface CampfireParticlesProps {
  className?: string;
  mode?: 'on' | 'eco' | 'off';
}

export const CampfireParticles: React.FC<CampfireParticlesProps> = ({ className, mode = 'on' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolvedTheme, theme } = useTheme();

  useEffect(() => {
    if (mode === 'off') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Detect active theme
    const isDark =
      resolvedTheme === 'dark' ||
      theme === 'dark' ||
      document.documentElement.classList.contains('dark');
    const isLemon =
      resolvedTheme === 'light-lemon' ||
      theme === 'light-lemon' ||
      document.documentElement.classList.contains('light-lemon');

    // Color palettes tuned for each theme:
    // Dark: Fiery embers (oranges, ambers, flame reds) with warm glow
    // Light-lemon: Golden lemon pollen / sparks (amber yellows, lemon golds)
    // Light: Subtle warm ashes / soft embers (caramel, gentle amber) with lower opacity
    const colors = isDark
      ? [paletteColor('orange-500'), paletteColor('orange-400'), paletteColor('red-500'), paletteColor('amber-500'), paletteColor('red-600'), paletteColor('amber-400')]
      : isLemon
      ? [paletteColor('yellow-500'), paletteColor('yellow-400'), paletteColor('amber-600'), paletteColor('amber-500'), paletteColor('yellow-600'), paletteColor('yellow-200')]
      : [paletteColor('amber-600'), paletteColor('orange-600'), paletteColor('amber-500'), paletteColor('amber-700'), paletteColor('stone-500')];

    const baseOpacityMult = isDark ? 0.85 : isLemon ? 0.7 : 0.55;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isEco = mode === 'eco';
    const targetFps = isEco ? 30 : 60;
    const frameInterval = 1000 / targetFps;

    const particleCount = isEco
      ? (width < 768 ? 14 : 28)
      : (width < 768 ? 28 : width < 1440 ? 48 : 64);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.8 + 1,
        speedY: -(Math.random() * 0.5 + 0.15),
        speedX: (Math.random() - 0.5) * 0.25,
        alpha: (Math.random() * 0.4 + 0.2) * baseOpacityMult,
        baseAlpha: (Math.random() * 0.4 + 0.2) * baseOpacityMult,
        color: colors[Math.floor(Math.random() * colors.length)],
        wobbleSpeed: Math.random() * 0.02 + 0.008,
        wobbleAmp: Math.random() * 1.5 + 0.5,
        wobblePhase: Math.random() * Math.PI * 2,
      });
    }

    let animationFrameId: number;
    let isRunning = true;
    let lastTime = performance.now();

    const render = (currentTime: number) => {
      if (!isRunning || document.hidden) return;

      animationFrameId = requestAnimationFrame(render);

      const elapsed = currentTime - lastTime;
      if (elapsed < frameInterval) return;

      lastTime = currentTime - (elapsed % frameInterval);

      ctx.clearRect(0, 0, width, height);

      // Render each ember
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.wobblePhase += p.wobbleSpeed;
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.wobblePhase) * 0.3;

        // Wrap around when particle floats off the top
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
          p.color = colors[Math.floor(Math.random() * colors.length)];
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Pulse alpha gently
        const currentAlpha = p.baseAlpha * (0.8 + Math.sin(p.wobblePhase * 2) * 0.2);

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, currentAlpha));

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const handleVisibilityChange = () => {
      if (!isRunning) return;
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        lastTime = performance.now();
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    animationFrameId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resolvedTheme, theme, mode]);

  if (mode === 'off') {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={className || "pointer-events-none fixed inset-0 z-0 h-full w-full opacity-90 transition-opacity duration-700"}
      aria-hidden="true"
    />
  );
};
