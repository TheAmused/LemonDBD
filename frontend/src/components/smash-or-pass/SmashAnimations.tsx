import type { Dictionary } from '@/locales/types';
// frontend/src/components/smash-or-pass/SmashAnimations.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Heart, Flame, Skull, Zap } from 'lucide-react';

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
  type: 'heart' | 'skull' | 'spark' | 'ember' | 'lightning_spark' | 'star';
  life: number;
  maxLife: number;
  drag?: number;
  glow?: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  color: string;
  lineWidth: number;
  alpha: number;
  decay: number;
}

interface LightningBolt {
  segments: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  color: string;
  width: number;
  alpha: number;
  decay: number;
}

export interface SmashAnimationsProps {
  triggerType: 'smash' | 'super_smash' | 'pass' | null;
  triggerKey: number; // Incrementing key to re-trigger
  originX?: number;
  originY?: number;
  dict?: Dictionary;
}

// Generate jagged lightning path
function createLightningPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  displace: number,
  branchChance: number,
  depth = 0
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  if (displace < 4 || depth > 5) {
    segments.push({ x1, y1, x2, y2 });
    return segments;
  }

  const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * displace;
  const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * displace;

  segments.push(...createLightningPath(x1, y1, midX, midY, displace / 2, branchChance, depth + 1));
  segments.push(...createLightningPath(midX, midY, x2, y2, displace / 2, branchChance, depth + 1));

  if (Math.random() < branchChance && depth < 3) {
    const branchAngle = Math.atan2(y2 - y1, x2 - x1) + ((Math.random() - 0.5) * Math.PI) / 2;
    const branchLength = (Math.hypot(x2 - x1, y2 - y1) / 2) * (0.4 + Math.random() * 0.4);
    const branchEndX = midX + Math.cos(branchAngle) * branchLength;
    const branchEndY = midY + Math.sin(branchAngle) * branchLength;
    segments.push(
      ...createLightningPath(midX, midY, branchEndX, branchEndY, displace / 2, 0, depth + 1)
    );
  }

  return segments;
}

export const SmashAnimations: React.FC<SmashAnimationsProps> = ({
  triggerType,
  triggerKey,
  originX,
  originY,
  dict,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<'smash' | 'super_smash' | 'pass' | null>(null);
  const [chromaticShift, setChromaticShift] = useState(false);

  const smashLabel = dict?.smashOrPass?.controls?.smash || dict?.smashOrPass?.smash || 'SMASH!';
  const superSmashLabel =
    dict?.smashOrPass?.controls?.superSmash || dict?.smashOrPass?.superSmash || 'SUPER SMASH!';
  const passLabel = dict?.smashOrPass?.controls?.pass || dict?.smashOrPass?.pass || 'PASSED';

  useEffect(() => {
    if (!triggerType) return;

    setActiveOverlay(triggerType);
    setChromaticShift(true);

    const shiftTimer = setTimeout(() => setChromaticShift(false), 240);
    const overlayTimer = setTimeout(() => setActiveOverlay(null), 450);

    const canvas = canvasRef.current;
    if (!canvas) {
      return () => {
        clearTimeout(shiftTimer);
        clearTimeout(overlayTimer);
      };
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return () => {
        clearTimeout(shiftTimer);
        clearTimeout(overlayTimer);
      };
    }

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    const spawnX = originX ?? width / 2;
    const spawnY = originY ?? height / 2;

    const particles: Particle[] = [];
    const shockwaves: Shockwave[] = [];
    const lightnings: LightningBolt[] = [];

    // Theme Palettes
    // Neon Crimson: #ff0055, Deep Velvet Purple: #2e0854, Cyber Mint: #00f5d4, Eldritch Gold: #ffd166
    const crimsonPalette = ['#ff0055', '#ff2a7a', '#e11d48', '#fb7185', '#2e0854', '#ffffff'];
    const goldPalette = ['#ffd166', '#f59e0b', '#fbbf24', '#ff0055', '#00f5d4', '#ffffff'];
    const passPalette = ['#00f5d4', '#06b6d4', '#334155', '#1e293b', '#64748b', '#09090b'];

    // 1. Initialize Shockwaves
    if (triggerType === 'super_smash') {
      shockwaves.push(
        {
          x: spawnX,
          y: spawnY,
          radius: 10,
          maxRadius: Math.max(width, height) * 0.75,
          speed: 18,
          color: '#ffd166',
          lineWidth: 8,
          alpha: 1.0,
          decay: 0.02,
        },
        {
          x: spawnX,
          y: spawnY,
          radius: 5,
          maxRadius: Math.max(width, height) * 0.55,
          speed: 12,
          color: '#ff0055',
          lineWidth: 5,
          alpha: 0.9,
          decay: 0.025,
        },
        {
          x: spawnX,
          y: spawnY,
          radius: 0,
          maxRadius: Math.max(width, height) * 0.4,
          speed: 8,
          color: '#ffffff',
          lineWidth: 12,
          alpha: 1.0,
          decay: 0.04,
        }
      );

      // Generate Electric Lightning Arcs
      const boltCount = 12;
      for (let b = 0; b < boltCount; b++) {
        const angle = (b / boltCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const dist = Math.min(width, height) * (0.35 + Math.random() * 0.35);
        const endX = spawnX + Math.cos(angle) * dist;
        const endY = spawnY + Math.sin(angle) * dist;

        lightnings.push({
          segments: createLightningPath(spawnX, spawnY, endX, endY, 60, 0.45),
          color: b % 2 === 0 ? '#ffd166' : '#ffffff',
          width: Math.random() * 2.5 + 1.5,
          alpha: 1.0,
          decay: 0.035,
        });
      }
    } else if (triggerType === 'smash') {
      shockwaves.push(
        {
          x: spawnX,
          y: spawnY,
          radius: 10,
          maxRadius: Math.max(width, height) * 0.6,
          speed: 14,
          color: '#ff0055',
          lineWidth: 7,
          alpha: 1.0,
          decay: 0.024,
        },
        {
          x: spawnX,
          y: spawnY,
          radius: 0,
          maxRadius: Math.max(width, height) * 0.45,
          speed: 9,
          color: '#2e0854',
          lineWidth: 4,
          alpha: 0.8,
          decay: 0.03,
        }
      );
    } else {
      // Pass
      shockwaves.push({
        x: spawnX,
        y: spawnY,
        radius: 5,
        maxRadius: Math.max(width, height) * 0.4,
        speed: 10,
        color: '#00f5d4',
        lineWidth: 3,
        alpha: 0.7,
        decay: 0.03,
      });
    }

    // 2. Initialize Particles
    const particleCount =
      triggerType === 'super_smash' ? 80 : triggerType === 'smash' ? 55 : 35;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed =
        triggerType === 'super_smash'
          ? Math.random() * 12 + 4
          : triggerType === 'smash'
          ? Math.random() * 9 + 3
          : Math.random() * 6 + 2;

      let type: Particle['type'] = 'spark';
      if (triggerType === 'super_smash') {
        const r = Math.random();
        if (r < 0.35) type = 'heart';
        else if (r < 0.55) type = 'star';
        else if (r < 0.75) type = 'lightning_spark';
        else type = 'ember';
      } else if (triggerType === 'smash') {
        const r = Math.random();
        if (r < 0.45) type = 'heart';
        else if (r < 0.65) type = 'skull';
        else if (r < 0.85) type = 'ember';
        else type = 'spark';
      } else {
        type = Math.random() > 0.4 ? 'skull' : 'spark';
      }

      const palette =
        triggerType === 'super_smash'
          ? goldPalette
          : triggerType === 'smash'
          ? crimsonPalette
          : passPalette;

      const color = palette[Math.floor(Math.random() * palette.length)];

      particles.push({
        x: spawnX,
        y: spawnY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (triggerType === 'pass' ? -1 : 2.5),
        size:
          type === 'heart'
            ? Math.random() * 14 + 10
            : type === 'skull'
            ? Math.random() * 16 + 12
            : Math.random() * 6 + 3,
        color,
        alpha: 1.0,
        decay: Math.random() * 0.018 + 0.012,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        type,
        life: 0,
        maxLife: Math.random() * 50 + 40,
        drag: 0.97,
        glow: Math.random() * 15 + 8,
      });
    }

    let animationFrame: number;

    // Draw stylized neon heart
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

    // Draw stylized neon skull
    const drawSkull = (
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
      context.globalAlpha = Math.max(0, Math.min(1, alpha));
      context.fillStyle = color;
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.shadowColor = color;
      context.shadowBlur = 14;

      // Cranium
      context.beginPath();
      context.arc(0, -4, 10, Math.PI * 0.8, Math.PI * 2.2);
      // Jaw
      context.lineTo(5, 8);
      context.lineTo(-5, 8);
      context.closePath();
      context.fill();

      // Eye sockets
      context.fillStyle = '#09090b';
      context.beginPath();
      context.arc(-4, -2, 2.5, 0, Math.PI * 2);
      context.arc(4, -2, 2.5, 0, Math.PI * 2);
      context.fill();

      context.restore();
    };

    // Draw radiant spark / star
    const drawSpark = (
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      color: string,
      alpha: number
    ) => {
      context.save();
      context.translate(x, y);
      context.globalAlpha = Math.max(0, Math.min(1, alpha));
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 12;

      context.beginPath();
      context.arc(0, 0, size, 0, Math.PI * 2);
      context.fill();

      // Mini flare cross
      context.strokeStyle = color;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(-size * 2, 0);
      context.lineTo(size * 2, 0);
      context.moveTo(0, -size * 2);
      context.lineTo(0, size * 2);
      context.stroke();

      context.restore();
    };

    // Main Render Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      let isAlive = false;

      // 1. Draw Shockwaves
      for (const sw of shockwaves) {
        if (sw.alpha > 0 && sw.radius < sw.maxRadius) {
          isAlive = true;
          sw.radius += sw.speed;
          sw.alpha -= sw.decay;

          ctx.save();
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
          ctx.strokeStyle = sw.color;
          ctx.lineWidth = Math.max(1, sw.lineWidth * (sw.alpha / 1.0));
          ctx.globalAlpha = Math.max(0, sw.alpha);
          ctx.shadowColor = sw.color;
          ctx.shadowBlur = 24;
          ctx.stroke();
          ctx.restore();
        }
      }

      // 2. Draw Lightning Bolts
      for (const bolt of lightnings) {
        if (bolt.alpha > 0) {
          isAlive = true;
          bolt.alpha -= bolt.decay;

          ctx.save();
          ctx.strokeStyle = bolt.color;
          ctx.lineWidth = bolt.width;
          ctx.globalAlpha = Math.max(0, bolt.alpha);
          ctx.shadowColor = bolt.color;
          ctx.shadowBlur = 18;

          ctx.beginPath();
          for (const seg of bolt.segments) {
            // slight frame jitter for electric crackle
            const jx = (Math.random() - 0.5) * 1.5;
            const jy = (Math.random() - 0.5) * 1.5;
            ctx.moveTo(seg.x1 + jx, seg.y1 + jy);
            ctx.lineTo(seg.x2 + jx, seg.y2 + jy);
          }
          ctx.stroke();
          ctx.restore();
        }
      }

      // 3. Draw Particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // Gravity
        if (p.drag) {
          p.vx *= p.drag;
          p.vy *= p.drag;
        }
        p.rotation += p.rotationSpeed;
        p.alpha -= p.decay;
        p.life += 1;

        if (p.alpha > 0) {
          isAlive = true;
          if (p.type === 'heart') {
            drawHeart(ctx, p.x, p.y, p.size, p.color, p.alpha, p.rotation);
          } else if (p.type === 'skull') {
            drawSkull(ctx, p.x, p.y, p.size, p.color, p.alpha, p.rotation);
          } else {
            drawSpark(ctx, p.x, p.y, p.size, p.color, p.alpha);
          }
        }
      }

      if (isAlive) {
        animationFrame = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      clearTimeout(shiftTimer);
      clearTimeout(overlayTimer);
      cancelAnimationFrame(animationFrame);
    };
  }, [triggerKey, triggerType, originX, originY]);

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${
        chromaticShift
          ? 'backdrop-blur-[1px] filter drop-shadow-[-3px_0_0_rgba(255,0,85,0.6)] drop-shadow-[3px_0_0_rgba(0,245,212,0.6)]'
          : ''
      }`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Screen Vignette Overlay: SMASH */}
      {activeOverlay === 'smash' && (
        <div className="absolute inset-0 bg-radial from-[#ff0055]/20 via-[#2e0854]/10 to-transparent animate-out fade-out duration-400">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 animate-in zoom-in-75 fade-in duration-200">
              <div className="relative flex items-center justify-center">
                <Heart className="h-16 w-16 sm:h-20 sm:w-20 text-[#ff0055] fill-[#ff0055] drop-shadow-[0_0_30px_rgba(255,0,85,0.9)] animate-pulse" />
                <Skull className="absolute h-8 w-8 sm:h-10 sm:w-10 text-slate-950/80 drop-shadow" />
              </div>
              <span className="text-xl sm:text-2xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-[#ff0055] to-red-400 drop-shadow-[0_0_20px_rgba(255,0,85,0.8)] font-mono">
                {smashLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Screen Vignette Overlay: SUPER SMASH */}
      {activeOverlay === 'super_smash' && (
        <div className="absolute inset-0 bg-radial from-[#ffd166]/25 via-[#ff0055]/15 to-[#09090b]/30 animate-out fade-out duration-450">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 animate-in zoom-in-75 fade-in duration-200">
              <div className="relative flex items-center justify-center">
                <Flame className="h-20 w-20 sm:h-24 sm:w-24 text-[#ffd166] fill-[#ffd166] drop-shadow-[0_0_35px_rgba(255,209,102,0.95)] animate-bounce" />
                <Zap className="absolute h-10 w-10 sm:h-12 sm:w-12 text-[#ff0055] fill-[#ff0055] drop-shadow-[0_0_20px_rgba(255,0,85,0.9)] animate-pulse" />
              </div>
              <span className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#ffd166] via-amber-200 to-[#ff0055] drop-shadow-[0_0_25px_rgba(255,209,102,0.9)] font-mono">
                {superSmashLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Screen Vignette Overlay: PASS */}
      {activeOverlay === 'pass' && (
        <div className="absolute inset-0 bg-radial from-[#00f5d4]/15 via-[#09090b]/40 to-transparent animate-out fade-out duration-350">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 animate-in zoom-in-75 fade-in duration-150 opacity-90">
              <Skull className="h-16 w-16 sm:h-20 sm:w-20 text-[#00f5d4] drop-shadow-[0_0_25px_rgba(0,245,212,0.8)]" />
              <span className="text-lg sm:text-xl font-black uppercase tracking-widest text-[#00f5d4] drop-shadow font-mono">
                {passLabel}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
