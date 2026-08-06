'use client';

import React, { useEffect, useRef } from 'react';

interface ConfettiProps {
  active: boolean;
}

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
}

const COLORS = ['#fb923c', '#f97316', '#34d399', '#fbbf24', '#f87171', '#e2e8f0'];
const PIECE_COUNT = 140;
const DURATION_MS = 3200;

export const Confetti: React.FC<ConfettiProps> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const start = performance.now();

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const pieces: Piece[] = Array.from({ length: PIECE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.6,
      vx: (Math.random() - 0.5) * 1.6,
      vy: 2 + Math.random() * 3,
      size: 5 + Math.random() * 6,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const draw = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fade the whole burst out over its final second.
      ctx.globalAlpha = elapsed > DURATION_MS - 1000
        ? Math.max(0, (DURATION_MS - elapsed) / 1000)
        : 1;

      for (const piece of pieces) {
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.vy += 0.02;
        piece.rotation += piece.spin;

        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.6);
        ctx.restore();
      }

      if (elapsed < DURATION_MS) {
        frame = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
};
