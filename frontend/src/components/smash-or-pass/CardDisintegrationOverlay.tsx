// frontend/src/components/smash-or-pass/CardDisintegrationOverlay.tsx
'use client';

import React, { useEffect, useRef } from 'react';

export interface CardDisintegrationOverlayProps {
  exitType: 'smash' | 'pass' | 'super_smash';
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  wobble: number;
  wobbleSpeed: number;
  rotation: number;
  vRot: number;
  alpha: number;
  color: string;
  type?: 'heart' | 'voxel' | 'ribbon' | 'spark';
  width?: number;
  height?: number;
  points?: number[];
  innerSize?: number;
  sparkles?: Array<{ dx: number; dy: number; alpha: number }>;
}

interface DigitalGlitchSlice {
  y: number;
  height: number;
  offsetX: number;
  color: string;
  alpha: number;
}

export const CardDisintegrationOverlay: React.FC<CardDisintegrationOverlayProps> = ({
  exitType,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const completedRef = useRef(false);
  const variantRef = useRef<number>(Math.floor(Math.random() * 3));

  useEffect(() => {
    completedRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = (canvas.width = canvas.parentElement?.clientWidth || 380);
    const height = (canvas.height = canvas.parentElement?.clientHeight || 580);

    const startTime = performance.now();
    const duration = 1500; // 1.5s duration
    const variant = variantRef.current;

    // Fallback watchdog timer
    const fallbackTimer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    }, duration + 100);

    // Color Palettes
    // Palette: Deep void (#09090b), Neon Crimson (#ff0055), Cyber Mint (#00f5d4), Deep Velvet Purple (#2e0854), Eldritch Gold (#ffd166)
    const crimsonPalette = ['#ff0055', '#ff2a7a', '#fb7185', '#2e0854', '#fda4af', '#ffffff'];
    const goldPalette = ['#ffd166', '#f59e0b', '#fbbf24', '#ff0055', '#fff1f2', '#ffffff'];
    const voidCyanPalette = ['#00f5d4', '#06b6d4', '#2e0854', '#09090b', '#334155', '#64748b'];

    // Spawn Particles
    const particles: Particle[] = [];
    const ribbonSlices: Array<{ y: number; height: number; speedX: number; dir: number }> = [];

    if (exitType === 'pass') {
      // 1. Digital Shredder Ribbons
      const sliceCount = 18;
      const sliceH = height / sliceCount;
      for (let s = 0; s < sliceCount; s++) {
        ribbonSlices.push({
          y: s * sliceH,
          height: sliceH + 1,
          speedX: (Math.random() * 14 + 6) * (s % 2 === 0 ? 1 : -1),
          dir: s % 2 === 0 ? 1 : -1,
        });
      }

      // 2. Dissolving Digital Voxels & Glitch Pixels
      const voxelCount = 90;
      for (let i = 0; i < voxelCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 8 + 3,
          width: Math.random() * 12 + 4,
          height: Math.random() * 4 + 2,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.5) * 8 - 1,
          wobble: 0,
          wobbleSpeed: 0,
          rotation: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 0.2,
          alpha: 1.0,
          color: voidCyanPalette[Math.floor(Math.random() * voidCyanPalette.length)],
          type: 'voxel',
        });
      }
    } else if (exitType === 'super_smash') {
      // Super Smash Gold Burst Particles
      const count = 75;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: width * 0.15 + Math.random() * (width * 0.7),
          y: height * 0.3 + Math.random() * (height * 0.5),
          size: Math.random() * 26 + 10,
          vx: (Math.random() - 0.5) * 8,
          vy: -(Math.random() * 4.5 + 2.5),
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: Math.random() * 0.09 + 0.04,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.2,
          alpha: 1.0,
          color: goldPalette[Math.floor(Math.random() * goldPalette.length)],
          type: Math.random() > 0.5 ? 'heart' : 'spark',
        });
      }
    } else {
      // Smash Neon Crimson Particles
      const count = 65;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: width * 0.1 + Math.random() * (width * 0.8),
          y: height * 0.35 + Math.random() * (height * 0.6),
          size: Math.random() * 24 + 8,
          vx: (Math.random() - 0.5) * 5,
          vy: -(Math.random() * 3.8 + 2),
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: Math.random() * 0.08 + 0.03,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.15,
          alpha: 1.0,
          color: crimsonPalette[Math.floor(Math.random() * crimsonPalette.length)],
          type: 'heart',
        });
      }
    }

    const drawHeart = (
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      color: string,
      alpha: number
    ) => {
      context.save();
      context.translate(x, y);
      context.scale(size / 20, size / 20);
      context.globalAlpha = Math.max(0, Math.min(1, alpha));
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 16;
      context.beginPath();
      context.moveTo(0, 0);
      context.bezierCurveTo(-10, -10, -20, 5, 0, 20);
      context.bezierCurveTo(20, 5, 10, -10, 0, 0);
      context.fill();
      context.restore();
    };

    const render = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      ctx.clearRect(0, 0, width, height);

      // =========================== PASS: DIGITAL SHREDDER & CRT SCANLINES ===========================
      if (exitType === 'pass') {
        // 1. Desaturation Sweep into Digital Void (#09090b)
        const sweepProgress = Math.min(1, progress * 1.5);
        ctx.save();
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, `rgba(9, 9, 11, ${sweepProgress * 0.95})`);
        grad.addColorStop(0.5, `rgba(46, 8, 84, ${sweepProgress * 0.6})`);
        grad.addColorStop(1, `rgba(9, 9, 11, ${sweepProgress * 0.98})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // 2. Digital Shredder Slices
        for (const slice of ribbonSlices) {
          const shift = Math.pow(progress, 1.8) * slice.speedX * 40;
          ctx.save();
          ctx.translate(shift, 0);
          ctx.fillStyle = `rgba(9, 9, 11, ${Math.max(0, 0.9 - progress * 0.85)})`;
          ctx.strokeStyle = `rgba(0, 245, 212, ${Math.max(0, 0.7 - progress * 0.7)})`;
          ctx.lineWidth = 1.5;
          ctx.fillRect(0, slice.y, width, slice.height);
          ctx.strokeRect(0, slice.y, width, slice.height);
          ctx.restore();
        }

        // 3. CRT Scanline Glitch & Chromatic Offset
        const scanlineCount = Math.floor(height / 4);
        ctx.save();
        for (let s = 0; s < scanlineCount; s++) {
          const y = s * 4;
          ctx.fillStyle = s % 2 === 0 ? 'rgba(0, 245, 212, 0.08)' : 'rgba(9, 9, 11, 0.25)';
          ctx.fillRect(0, y, width, 1.5);
        }

        // Random Glitch Jitter Bars
        if (Math.random() < 0.6 && progress < 0.85) {
          const glitchY = Math.random() * height;
          const glitchH = Math.random() * 16 + 4;
          const glitchShift = (Math.random() - 0.5) * 35;

          // Cyan / Crimson Chromatic Split Bars
          ctx.fillStyle = 'rgba(0, 245, 212, 0.35)';
          ctx.fillRect(glitchShift, glitchY, width, glitchH);

          ctx.fillStyle = 'rgba(255, 0, 85, 0.3)';
          ctx.fillRect(-glitchShift, glitchY + 2, width, glitchH);
        }
        ctx.restore();

        // 4. Disintegration Voxels flying into the void
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.vRot;
          p.alpha = Math.max(0, 1 - progress * 0.9);

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fillRect(-(p.width || 6) / 2, -(p.height || 4) / 2, p.width || 6, p.height || 4);
          ctx.restore();
        }
      } else if (exitType === 'super_smash') {
        // =========================== SUPER SMASH: GOLDEN RADIANT BURST ===========================
        // Concentric Golden Shockwave Rings
        const rings = 3;
        for (let r = 1; r <= rings; r++) {
          const rSize = (progress * width * 1.1 * r) / rings;
          ctx.save();
          ctx.strokeStyle = `rgba(255, 209, 102, ${Math.max(0, 0.9 - progress)})`;
          ctx.lineWidth = 6 * (1 - progress);
          ctx.shadowColor = '#ffd166';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, rSize, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Center Heart Flare
        drawHeart(
          ctx,
          width / 2,
          height / 2 - 20,
          65 * (1 + progress * 0.4),
          '#ffd166',
          1 - progress * 0.8
        );

        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.wobble += p.wobbleSpeed;
          p.rotation += p.vRot;
          p.alpha = Math.max(0, 1 - progress * 0.8);

          if (p.type === 'heart') {
            drawHeart(ctx, p.x, p.y, p.size, p.color, p.alpha);
          } else {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 0.25, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      } else {
        // =========================== SMASH: NEON CRIMSON BLOOM ===========================
        // Expanding Crimson Shockwave
        const shockRadius = progress * width * 0.95;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 0, 85, ${Math.max(0, 0.9 - progress)})`;
        ctx.lineWidth = 7 * (1 - progress);
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 28;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, shockRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Pulsing Bloom Heart
        drawHeart(
          ctx,
          width / 2,
          height / 2 - 25,
          60 * (1 + progress * 0.35),
          '#ff0055',
          1 - progress * 0.75
        );

        for (const p of particles) {
          p.y += p.vy;
          p.wobble += p.wobbleSpeed;
          p.x += Math.sin(p.wobble) * 2.2 + p.vx;
          p.alpha = Math.max(0, 1 - progress * 0.75);

          drawHeart(ctx, p.x, p.y, p.size, p.color, p.alpha);
        }
      }

      if (progress < 1) {
        animId = requestAnimationFrame(render);
      } else {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      clearTimeout(fallbackTimer);
      cancelAnimationFrame(animId);
    };
  }, [exitType, onComplete]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-50 overflow-hidden rounded-[32px] sm:rounded-[36px]"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
};
