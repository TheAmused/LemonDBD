// frontend/src/components/common/CampfireParticles.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

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

interface CampfireParticlesProps {
  className?: string;
}

export const CampfireParticles: React.FC<CampfireParticlesProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolvedTheme, theme } = useTheme();

  useEffect(() => {
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
      ? ['#f97316', '#fb923c', '#ef4444', '#f59e0b', '#dc2626', '#fbbf24']
      : isLemon
      ? ['#eab308', '#facc15', '#d97706', '#f59e0b', '#ca8a04', '#fef08a']
      : ['#d97706', '#ea580c', '#f59e0b', '#b45309', '#78716c'];

    const baseOpacityMult = isDark ? 0.85 : isLemon ? 0.7 : 0.55;
    const particleCount = typeof window !== 'undefined'
      ? (window.innerWidth < 768 ? 32 : window.innerWidth < 1440 ? 52 : window.innerWidth < 2560 ? 75 : 100)
      : 52;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

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

    const render = () => {
      if (!isRunning) return;
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

        // Soft glow for larger embers
        if (isDark && p.size > 2) {
          ctx.shadowBlur = p.size * 3;
          ctx.shadowColor = p.color;
        }

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [resolvedTheme, theme]);

  return (
    <canvas
      ref={canvasRef}
      className={className || "pointer-events-none fixed inset-0 z-0 h-full w-full opacity-90 transition-opacity duration-700"}
      aria-hidden="true"
    />
  );
};
