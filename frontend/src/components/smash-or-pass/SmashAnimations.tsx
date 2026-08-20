// frontend/src/components/smash-or-pass/SmashAnimations.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Heart, Flame, Skull } from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  rotationSpeed: number;
  isHeart: boolean;
}

interface SmashAnimationsProps {
  triggerType: 'smash' | 'super_smash' | 'pass' | null;
  triggerKey: number; // Incrementing key to re-trigger
  originX?: number;
  originY?: number;
}

export const SmashAnimations: React.FC<SmashAnimationsProps> = ({
  triggerType,
  triggerKey,
  originX,
  originY,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<'smash' | 'super_smash' | 'pass' | null>(null);

  useEffect(() => {
    if (!triggerType) return;

    setActiveOverlay(triggerType);
    const timer = setTimeout(() => {
      setActiveOverlay(null);
    }, 900);

    // Canvas particle engine
    const canvas = canvasRef.current;
    if (!canvas) return () => clearTimeout(timer);

    const ctx = canvas.getContext('2d');
    if (!ctx) return () => clearTimeout(timer);

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    const spawnX = originX ?? width / 2;
    const spawnY = originY ?? height / 2;

    const particleCount = triggerType === 'super_smash' ? 70 : triggerType === 'smash' ? 45 : 30;
    const particles: Particle[] = [];

    const heartColors =
      triggerType === 'super_smash'
        ? ['#fbbf24', '#f59e0b', '#ef4444', '#f43f5e', '#ec4899', '#ffffff']
        : triggerType === 'smash'
        ? ['#f43f5e', '#e11d48', '#be123c', '#fda4af', '#ff2d55', '#ffffff']
        : ['#64748b', '#475569', '#334155', '#94a3b8', '#991b1b'];

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed =
        triggerType === 'super_smash'
          ? Math.random() * 9 + 4
          : triggerType === 'smash'
          ? Math.random() * 7 + 2.5
          : Math.random() * 5 + 1.5;

      particles.push({
        x: spawnX,
        y: spawnY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (triggerType === 'pass' ? -1 : 2),
        size: Math.random() * 14 + 10,
        color: heartColors[Math.floor(Math.random() * heartColors.length)],
        alpha: 1.0,
        decay: Math.random() * 0.015 + 0.012,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        isHeart: triggerType !== 'pass' || Math.random() > 0.5,
      });
    }

    let animationFrame: number;

    const drawHeart = (
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      color: string,
      alpha: number,
      rotation: number
    ) => {
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.scale(size / 20, size / 20);
      context.globalAlpha = Math.max(0, alpha);
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 10;

      context.beginPath();
      context.moveTo(0, 0);
      context.bezierCurveTo(-10, -10, -20, 5, 0, 20);
      context.bezierCurveTo(20, 5, 10, -10, 0, 0);
      context.fill();
      context.restore();
    };

    const drawClaw = (
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      color: string,
      alpha: number,
      rotation: number
    ) => {
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.globalAlpha = Math.max(0, alpha);
      context.strokeStyle = color;
      context.lineWidth = 2.5;
      context.shadowColor = color;
      context.shadowBlur = 8;

      context.beginPath();
      context.moveTo(-size / 2, -size / 2);
      context.quadraticCurveTo(0, size / 2, size / 2, size);
      context.stroke();
      context.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // Gravity
        p.vx *= 0.98;
        p.rotation += p.rotationSpeed;
        p.alpha -= p.decay;

        if (p.alpha > 0) {
          alive = true;
          if (p.isHeart) {
            drawHeart(ctx, p.x, p.y, p.size, p.color, p.alpha, p.rotation);
          } else {
            drawClaw(ctx, p.x, p.y, p.size, p.color, p.alpha, p.rotation);
          }
        }
      }

      if (alive) {
        animationFrame = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationFrame);
    };
  }, [triggerKey, triggerType, originX, originY]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Screen Vignette Overlay */}
      {activeOverlay === 'smash' && (
        <div className="absolute inset-0 bg-radial from-rose-600/20 via-transparent to-transparent animate-out fade-out duration-700">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 animate-in zoom-in-50 fade-in duration-300">
              <div className="relative">
                <Heart className="h-24 w-24 text-rose-500 fill-rose-500 drop-shadow-[0_0_25px_rgba(244,63,94,0.8)] animate-pulse" />
                <Heart className="absolute inset-0 h-24 w-24 text-pink-300 fill-pink-300/40 animate-ping opacity-60" />
              </div>
              <span className="text-xl sm:text-2xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-red-400 drop-shadow-md">
                SMASH!
              </span>
            </div>
          </div>
        </div>
      )}

      {activeOverlay === 'super_smash' && (
        <div className="absolute inset-0 bg-radial from-amber-500/25 via-rose-900/15 to-transparent animate-out fade-out duration-900">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 animate-in zoom-in-75 fade-in duration-300">
              <div className="relative">
                <Flame className="h-32 w-32 text-amber-400 fill-amber-400 drop-shadow-[0_0_35px_rgba(251,191,36,0.9)] animate-bounce" />
                <Heart className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 text-rose-500 fill-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.9)]" />
              </div>
              <span className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-pink-500 drop-shadow-lg">
                SUPER SMASH!
              </span>
            </div>
          </div>
        </div>
      )}

      {activeOverlay === 'pass' && (
        <div className="absolute inset-0 bg-radial from-slate-900/30 via-slate-950/20 to-transparent animate-out fade-out duration-600">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 animate-in zoom-in-50 fade-in duration-200 opacity-80">
              <Skull className="h-20 w-20 text-slate-400 drop-shadow-[0_0_20px_rgba(100,116,139,0.7)]" />
              <span className="text-lg sm:text-xl font-black uppercase tracking-widest text-slate-400 drop-shadow">
                PASSED
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
