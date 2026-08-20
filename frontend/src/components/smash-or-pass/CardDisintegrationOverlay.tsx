// frontend/src/components/smash-or-pass/CardDisintegrationOverlay.tsx
'use client';

import React, { useEffect, useRef } from 'react';

interface CardDisintegrationOverlayProps {
  exitType: 'smash' | 'pass';
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
  points?: number[];
  innerSize?: number;
  sparkles?: Array<{ dx: number; dy: number; alpha: number }>;
}

export const CardDisintegrationOverlay: React.FC<CardDisintegrationOverlayProps> = ({
  exitType,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const completedRef = useRef(false);

  // Pick a random animation variation on each exit trigger
  const variantRef = useRef<number>(Math.floor(Math.random() * 4));

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
    const pinkPalette = [
      '#f43f5e', '#fb7185', '#fda4af', '#ec4899', '#f472b6', '#ff2d55', '#ffe4e6', '#fbbf24', '#ff69b4',
    ];
    const goldRosePalette = ['#f43f5e', '#fbbf24', '#f59e0b', '#ec4899', '#fff1f2', '#fda4af'];
    const darkPalette = ['#020617', '#0f172a', '#1e293b', '#334155', '#450a0a', '#18181b', '#000000'];
    const purpleVoidPalette = ['#3b0764', '#581c87', '#1e1b4b', '#09090b', '#6b21a8', '#dc2626'];

    // Spawn Particles according to random variant
    const particles: Particle[] = [];

    if (exitType === 'smash') {
      const count = variant === 2 ? 85 : 65;
      for (let i = 0; i < count; i++) {
        const sparkles = [];
        for (let s = 0; s < 4; s++) {
          sparkles.push({
            dx: (Math.random() - 0.5) * 20,
            dy: (Math.random() - 0.5) * 20,
            alpha: Math.random(),
          });
        }
        particles.push({
          x: width * 0.1 + Math.random() * (width * 0.8),
          y: height * 0.35 + Math.random() * (height * 0.6),
          size: Math.random() * 24 + 8,
          vx: (Math.random() - 0.5) * (variant === 1 ? 4.5 : 2.5),
          vy: -(Math.random() * 3.4 + 1.8),
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: Math.random() * 0.08 + 0.03,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.15,
          alpha: 1,
          color:
            variant === 1
              ? goldRosePalette[Math.floor(Math.random() * goldRosePalette.length)]
              : pinkPalette[Math.floor(Math.random() * pinkPalette.length)],
          innerSize: Math.random() * 12 + 5,
          sparkles,
        });
      }
    } else {
      // PASS Particles
      const count = variant === 2 ? 90 : 70;
      for (let i = 0; i < count; i++) {
        const pts: number[] = [];
        for (let p = 0; p < 6; p++) {
          pts.push((Math.random() - 0.5) * 20);
        }
        const isLeft = Math.random() > 0.5;
        particles.push({
          x: variant === 0 ? width / 2 + (Math.random() - 0.5) * 40 : Math.random() * width,
          y: Math.random() * height * 0.85,
          size: Math.random() * 22 + 8,
          vx: isLeft ? -(Math.random() * 4.5 + 2.0) : Math.random() * 4.5 + 2.0,
          vy: variant === 1 ? (Math.random() - 0.5) * 3 : Math.random() * 4.0 + 1.2,
          wobble: 0,
          wobbleSpeed: 0,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.3,
          alpha: 1,
          points: pts,
          color:
            variant === 1
              ? purpleVoidPalette[Math.floor(Math.random() * purpleVoidPalette.length)]
              : darkPalette[Math.floor(Math.random() * darkPalette.length)],
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
      context.shadowBlur = 14;
      context.beginPath();
      context.moveTo(0, 0);
      context.bezierCurveTo(-10, -10, -20, 5, 0, 20);
      context.bezierCurveTo(20, 5, 10, -10, 0, 0);
      context.fill();
      context.restore();
    };

    const drawBubble = (context: CanvasRenderingContext2D, p: Particle) => {
      context.save();
      context.translate(p.x, p.y);
      context.globalAlpha = Math.max(0, Math.min(1, p.alpha));

      const grad = context.createRadialGradient(
        -p.size * 0.35,
        -p.size * 0.35,
        p.size * 0.1,
        0,
        0,
        p.size
      );
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.25, 'rgba(253, 164, 175, 0.85)');
      grad.addColorStop(0.7, 'rgba(244, 63, 94, 0.5)');
      grad.addColorStop(1, 'rgba(225, 29, 72, 0.9)');

      context.fillStyle = grad;
      context.strokeStyle = 'rgba(255, 228, 230, 0.95)';
      context.lineWidth = 2;
      context.shadowColor = '#f43f5e';
      context.shadowBlur = 18;

      context.beginPath();
      context.arc(0, 0, p.size, 0, Math.PI * 2);
      context.fill();
      context.stroke();

      context.fillStyle = 'rgba(255, 255, 255, 0.95)';
      context.beginPath();
      context.arc(-p.size * 0.35, -p.size * 0.35, p.size * 0.24, 0, Math.PI * 2);
      context.fill();

      if (p.innerSize) {
        drawHeart(context, 0, -p.innerSize * 0.45, p.innerSize, p.color, p.alpha);
      }

      if (p.sparkles) {
        for (const sp of p.sparkles) {
          context.fillStyle = 'rgba(255, 255, 255, 0.95)';
          context.beginPath();
          context.arc(sp.dx, sp.dy, 1.8, 0, Math.PI * 2);
          context.fill();
        }
      }

      context.restore();
    };

    const render = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      ctx.clearRect(0, 0, width, height);

      // =========================== SMASH ANIMATIONS ===========================
      if (exitType === 'smash') {
        if (variant === 0) {
          // --- VARIANT 0: Heart Bloom & Fountain ---
          const heartScale = Math.sin(progress * Math.PI) * 1.35 + 0.9;
          const heartPulse = Math.sin(now * 0.015) * 4;

          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.scale(heartScale, heartScale);
          ctx.globalAlpha = Math.max(0, 1 - progress * 0.8);
          drawHeart(ctx, 0, -25 + heartPulse, 60, '#f43f5e', 1 - progress * 0.5);

          ctx.strokeStyle = 'rgba(244, 63, 94, 0.9)';
          ctx.lineWidth = 8 * (1 - progress);
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 30;
          ctx.beginPath();
          ctx.arc(0, 0, progress * Math.max(width, height) * 0.9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          for (const b of particles) {
            b.y += b.vy;
            b.wobble += b.wobbleSpeed;
            b.x += Math.sin(b.wobble) * 2.2 + b.vx;
            b.alpha = Math.max(0, 1 - progress * 0.7);
            drawBubble(ctx, b);
          }
        } else if (variant === 1) {
          // --- VARIANT 1: Cosmic Love Spiral Vortex ---
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.rotate(progress * Math.PI * 2);
          for (let arm = 0; arm < 3; arm++) {
            ctx.rotate((Math.PI * 2) / 3);
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
            ctx.lineWidth = 4 * (1 - progress);
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(0, 0, progress * (width * 0.75), 0, Math.PI * 0.7);
            ctx.stroke();
          }
          drawHeart(ctx, 0, -20, 50 * (1 + progress * 0.3), '#fb7185', 1 - progress * 0.8);
          ctx.restore();

          for (const b of particles) {
            b.rotation += b.vRot;
            b.x += b.vx;
            b.y += b.vy;
            b.alpha = Math.max(0, 1 - progress * 0.8);
            drawBubble(ctx, b);
          }
        } else if (variant === 2) {
          // --- VARIANT 2: Rose Petal & Stardust Nova ---
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.scale(1 + progress * 0.6, 1 + progress * 0.6);
          drawHeart(ctx, 0, -25, 70, '#f43f5e', 1 - progress * 0.85);
          ctx.restore();

          for (const p of particles) {
            p.x += p.vx * 1.5;
            p.y += p.vy;
            p.rotation += p.vRot;
            p.alpha = Math.max(0, 1 - progress * 0.8);

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            drawHeart(ctx, 0, 0, p.size, p.color, p.alpha);
            ctx.restore();
          }
        } else {
          // --- VARIANT 3: Cupid's Radiant Burst & Shockwaves ---
          const rings = 4;
          for (let r = 1; r <= rings; r++) {
            const rSize = (progress * width * 0.9 * r) / rings;
            ctx.save();
            ctx.strokeStyle = `rgba(244, 63, 94, ${Math.max(0, 0.8 - progress)})`;
            ctx.lineWidth = 6 * (1 - progress);
            ctx.shadowColor = '#f43f5e';
            ctx.shadowBlur = 24;
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, rSize, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
          drawHeart(ctx, width / 2, height / 2 - 20, 55 * (1 + progress * 0.4), '#ec4899', 1 - progress * 0.7);

          for (const b of particles) {
            b.y += b.vy;
            b.wobble += b.wobbleSpeed;
            b.x += Math.sin(b.wobble) * 2.0 + b.vx;
            b.alpha = Math.max(0, 1 - progress * 0.75);
            drawBubble(ctx, b);
          }
        }
      } else {
        // =========================== PASS ANIMATIONS ===========================
        if (variant === 0) {
          // --- VARIANT 0: Torn Split-Card & Fling with Shattered Black Heart ---
          const tearProgress = Math.min(1, progress * 2.2);
          const splitDist = progress * (width * 0.55);

          // Left Half Flying Left
          ctx.save();
          ctx.translate(width / 2 - splitDist, height / 2 + progress * 80);
          ctx.rotate(-progress * 0.45);
          ctx.globalAlpha = Math.max(0, 1 - progress * 0.9);
          ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.rect(-width / 2, -height / 2, width / 2 - 4, height);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // Right Half Flying Right
          ctx.save();
          ctx.translate(width / 2 + splitDist, height / 2 + progress * 80);
          ctx.rotate(progress * 0.45);
          ctx.globalAlpha = Math.max(0, 1 - progress * 0.9);
          ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.rect(4, -height / 2, width / 2 - 4, height);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // Shattered Black Heart
          ctx.save();
          ctx.translate(width / 2, height / 2 - progress * 40);
          ctx.scale(1.2 + progress * 0.3, 1.2 + progress * 0.3);
          ctx.globalAlpha = Math.max(0, 1 - progress * 0.85);

          ctx.fillStyle = '#05070e';
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#000';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.moveTo(0, -30);
          ctx.bezierCurveTo(-30, -65, -65, -15, 0, 45);
          ctx.bezierCurveTo(65, -15, 30, -65, 0, -30);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#dc2626';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.moveTo(0, -30);
          ctx.lineTo(-8 * tearProgress, -5);
          ctx.lineTo(10 * tearProgress, 15);
          ctx.lineTo(-6 * tearProgress, 32);
          ctx.lineTo(0, 45);
          ctx.stroke();
          ctx.restore();

          for (const f of particles) {
            f.x += f.vx;
            f.y += f.vy;
            f.rotation += f.vRot;
            f.alpha = Math.max(0, 1 - progress * 0.85);
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rotation);
            ctx.globalAlpha = f.alpha;
            ctx.fillStyle = f.color;
            ctx.beginPath();
            ctx.moveTo(f.points![0], f.points![1]);
            ctx.lineTo(f.points![2], f.points![3]);
            ctx.lineTo(f.points![4], f.points![5]);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        } else if (variant === 1) {
          // --- VARIANT 1: Black Hole Gravitational Abyss ---
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.rotate(progress * Math.PI * 3);
          const abyssRadius = progress * (width * 0.45);

          ctx.fillStyle = '#020617';
          ctx.shadowColor = '#7c3aed';
          ctx.shadowBlur = 30;
          ctx.beginPath();
          ctx.arc(0, 0, abyssRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#9333ea';
          ctx.lineWidth = 6 * (1 - progress);
          ctx.stroke();
          ctx.restore();

          for (const p of particles) {
            const dx = width / 2 - p.x;
            const dy = height / 2 - p.y;
            p.x += dx * 0.08 + p.vx * 0.5;
            p.y += dy * 0.08 + p.vy * 0.5;
            p.alpha = Math.max(0, 1 - progress * 0.9);

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0, 0, p.size * (1 - progress * 0.6), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        } else if (variant === 2) {
          // --- VARIANT 2: Obsidian Glass Shatter Nova ---
          ctx.save();
          ctx.fillStyle = `rgba(2, 6, 23, ${progress * 0.95})`;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();

          for (const s of particles) {
            s.x += s.vx * 1.8;
            s.y += s.vy * 1.8;
            s.rotation += s.vRot * 2;
            s.alpha = Math.max(0, 1 - progress * 0.85);

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rotation);
            ctx.globalAlpha = s.alpha;
            ctx.fillStyle = s.color;
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(s.points![0], s.points![1]);
            ctx.lineTo(s.points![2], s.points![3]);
            ctx.lineTo(s.points![4], s.points![5]);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        } else {
          // --- VARIANT 3: Entity Void Ash & Burning Decay ---
          ctx.save();
          ctx.fillStyle = `rgba(15, 23, 42, ${progress * 0.9})`;
          ctx.fillRect(0, 0, width, height);

          // Cracked Void Symbol in center
          ctx.translate(width / 2, height / 2);
          ctx.globalAlpha = Math.max(0, 1 - progress);
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#b91c1c';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.moveTo(-30, -30);
          ctx.lineTo(30, 30);
          ctx.moveTo(30, -30);
          ctx.lineTo(-30, 30);
          ctx.stroke();
          ctx.restore();

          for (const a of particles) {
            a.x += a.vx;
            a.y += a.vy;
            a.rotation += a.vRot;
            a.alpha = Math.max(0, 1 - progress * 0.8);

            ctx.save();
            ctx.translate(a.x, a.y);
            ctx.rotate(a.rotation);
            ctx.globalAlpha = a.alpha;
            ctx.fillStyle = a.color;
            ctx.beginPath();
            ctx.rect(-a.size / 2, -a.size / 2, a.size, a.size);
            ctx.fill();
            ctx.restore();
          }
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
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden rounded-[32px] sm:rounded-[36px]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
};
