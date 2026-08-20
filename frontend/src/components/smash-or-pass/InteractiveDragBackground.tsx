// frontend/src/components/smash-or-pass/InteractiveDragBackground.tsx
'use client';

import React, { useEffect, useRef } from 'react';

interface InteractiveDragBackgroundProps {
  dragX?: number; // < 0 is Pass (left), > 0 is Smash (right)
  dragY?: number; // < 0 is Super Smash (up)
  isDragging?: boolean;
  actionTrigger?: 'smash' | 'pass' | 'super_smash' | null;
  triggerKey?: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  alpha: number;
  baseAlpha: number;
  color: string;
  type: 'ember' | 'heart' | 'sad_ash' | 'star' | 'shattered_shard';
  rotation: number;
  rotationSpeed: number;
  life?: number;
  maxLife?: number;
  vx?: number;
  vy?: number;
}

export const InteractiveDragBackground: React.FC<InteractiveDragBackgroundProps> = ({
  dragX = 0,
  dragY = 0,
  isDragging = false,
  actionTrigger = null,
  triggerKey = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // References to keep smooth animation state across renders
  const stateRef = useRef({
    dragX: 0,
    dragY: 0,
    isDragging: false,
    smashIntensity: 0,
    passIntensity: 0,
    superIntensity: 0,
    actionTrigger: null as 'smash' | 'pass' | 'super_smash' | null,
    triggerKey: 0,
  });

  useEffect(() => {
    stateRef.current.dragX = dragX;
    stateRef.current.dragY = dragY;
    stateRef.current.isDragging = isDragging;
  }, [dragX, dragY, isDragging]);

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

    // Baseline ambient embers
    const embers: Particle[] = [];
    for (let i = 0; i < 28; i++) {
      embers.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 3 + 1,
        speedY: -(Math.random() * 0.4 + 0.15),
        speedX: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.4 + 0.1,
        baseAlpha: Math.random() * 0.4 + 0.1,
        color: Math.random() > 0.5 ? '#f43f5e' : '#fb923c',
        type: 'ember',
        rotation: 0,
        rotationSpeed: 0,
      });
    }

    // Dynamic Smash Hearts Pool (Falling / Floating)
    const smashHearts: Particle[] = [];
    const pinkPalette = ['#f43f5e', '#fb7185', '#fda4af', '#ec4899', '#f472b6', '#ff2d55'];
    for (let i = 0; i < 40; i++) {
      smashHearts.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 16 + 8,
        speedY: Math.random() * 1.5 + 0.8, // falling down
        speedX: (Math.random() - 0.5) * 0.5,
        alpha: 0,
        baseAlpha: Math.random() * 0.6 + 0.2,
        color: pinkPalette[Math.floor(Math.random() * pinkPalette.length)],
        type: 'heart',
        rotation: (Math.random() - 0.5) * 0.5,
        rotationSpeed: (Math.random() - 0.5) * 0.015,
      });
    }

    // Dynamic Sad Ash / Broken Heart Rain Pool
    const sadParticles: Particle[] = [];
    const sadPalette = ['#64748b', '#475569', '#334155', '#1e293b', '#94a3b8', '#0f172a'];
    for (let i = 0; i < 35; i++) {
      sadParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 12 + 6,
        speedY: Math.random() * 2.0 + 1.0, // heavy falling rain
        speedX: -0.8 - Math.random() * 0.5, // slanting left
        alpha: 0,
        baseAlpha: Math.random() * 0.5 + 0.2,
        color: sadPalette[Math.floor(Math.random() * sadPalette.length)],
        type: 'sad_ash',
        rotation: (Math.random() - 0.5) * 0.8,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
      });
    }

    // Action Burst Particle Array
    const burstParticles: Particle[] = [];

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
      context.shadowBlur = 10;

      context.beginPath();
      context.moveTo(0, 0);
      context.bezierCurveTo(-10, -10, -20, 5, 0, 20);
      context.bezierCurveTo(20, 5, 10, -10, 0, 0);
      context.fill();
      context.restore();
    };

    const drawBrokenHeart = (
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
      context.strokeStyle = '#020617';
      context.lineWidth = 2;

      context.beginPath();
      context.moveTo(0, 0);
      context.bezierCurveTo(-10, -10, -20, 5, 0, 20);
      context.bezierCurveTo(20, 5, 10, -10, 0, 0);
      context.fill();
      context.stroke();

      // Jagged crack down center
      context.strokeStyle = '#0f172a';
      context.beginPath();
      context.moveTo(0, -5);
      context.lineTo(-2, 4);
      context.lineTo(3, 10);
      context.lineTo(0, 20);
      context.stroke();

      context.restore();
    };

    let lastHandledKey = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const curState = stateRef.current;

      // Target intensities based on drag
      const targetSmash = curState.dragX > 20 ? Math.min(1, (curState.dragX - 20) / 75) : 0;
      const targetPass = curState.dragX < -20 ? Math.min(1, (Math.abs(curState.dragX) - 20) / 75) : 0;
      const targetSuper = curState.dragY < -30 ? Math.min(1, (Math.abs(curState.dragY) - 30) / 75) : 0;

      // Smooth lerp intensity
      curState.smashIntensity += (targetSmash - curState.smashIntensity) * 0.12;
      curState.passIntensity += (targetPass - curState.passIntensity) * 0.12;
      curState.superIntensity += (targetSuper - curState.superIntensity) * 0.12;

      // Handle Action Triggers
      if (curState.triggerKey !== lastHandledKey && curState.actionTrigger) {
        lastHandledKey = curState.triggerKey;
        const centerX = width / 2;
        const centerY = height / 2;

        if (curState.actionTrigger === 'smash') {
          for (let i = 0; i < 45; i++) {
            const angle = (Math.PI * 2 * i) / 45 + (Math.random() - 0.5) * 0.3;
            const spd = Math.random() * 8 + 3;
            burstParticles.push({
              x: centerX,
              y: centerY,
              size: Math.random() * 20 + 10,
              speedX: Math.cos(angle) * spd,
              speedY: Math.sin(angle) * spd - 1,
              alpha: 1,
              baseAlpha: 1,
              color: pinkPalette[Math.floor(Math.random() * pinkPalette.length)],
              type: 'heart',
              rotation: Math.random() * Math.PI,
              rotationSpeed: (Math.random() - 0.5) * 0.1,
              life: 0,
              maxLife: 60,
            });
          }
        } else if (curState.actionTrigger === 'pass') {
          // Shattered black dissolving shards
          for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 6 + 1.5;
            burstParticles.push({
              x: centerX + (Math.random() - 0.5) * 40,
              y: centerY + (Math.random() - 0.5) * 40,
              size: Math.random() * 16 + 6,
              speedX: Math.cos(angle) * spd,
              speedY: Math.sin(angle) * spd + 2.5, // dropping heavy
              alpha: 1,
              baseAlpha: 1,
              color: '#0f172a',
              type: 'shattered_shard',
              rotation: Math.random() * Math.PI,
              rotationSpeed: (Math.random() - 0.5) * 0.2,
              life: 0,
              maxLife: 55,
            });
          }
        } else if (curState.actionTrigger === 'super_smash') {
          for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 10 + 4;
            burstParticles.push({
              x: centerX,
              y: centerY,
              size: Math.random() * 22 + 8,
              speedX: Math.cos(angle) * spd,
              speedY: Math.sin(angle) * spd - 3,
              alpha: 1,
              baseAlpha: 1,
              color: Math.random() > 0.3 ? '#fbbf24' : '#f59e0b',
              type: 'heart',
              rotation: Math.random() * Math.PI,
              rotationSpeed: (Math.random() - 0.5) * 0.15,
              life: 0,
              maxLife: 70,
            });
          }
        }
      }

      // Background Ambient Glows
      if (curState.smashIntensity > 0.01) {
        const grad = ctx.createRadialGradient(
          width * 0.7,
          height * 0.5,
          50,
          width * 0.7,
          height * 0.5,
          Math.max(width, height) * 0.6
        );
        grad.addColorStop(0, `rgba(244, 63, 94, ${curState.smashIntensity * 0.18})`);
        grad.addColorStop(0.5, `rgba(225, 29, 72, ${curState.smashIntensity * 0.08})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (curState.passIntensity > 0.01) {
        const grad = ctx.createRadialGradient(
          width * 0.3,
          height * 0.5,
          50,
          width * 0.3,
          height * 0.5,
          Math.max(width, height) * 0.6
        );
        grad.addColorStop(0, `rgba(15, 23, 42, ${curState.passIntensity * 0.3})`);
        grad.addColorStop(0.5, `rgba(30, 41, 59, ${curState.passIntensity * 0.15})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // 1. Draw Normal Embers
      for (const e of embers) {
        e.y += e.speedY;
        e.x += e.speedX;
        if (e.y < 0) {
          e.y = height;
          e.x = Math.random() * width;
        }
        ctx.save();
        ctx.globalAlpha = e.alpha;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2. Draw Falling Smash Hearts when Dragging Right
      if (curState.smashIntensity > 0.02) {
        for (const h of smashHearts) {
          h.y += h.speedY * (1 + curState.smashIntensity * 1.5);
          h.x += h.speedX;
          h.rotation += h.rotationSpeed;
          if (h.y > height + 30) {
            h.y = -30;
            h.x = Math.random() * width;
          }
          drawHeart(ctx, h.x, h.y, h.size, h.color, h.baseAlpha * curState.smashIntensity, h.rotation);
        }
      }

      // 3. Draw Sad Weeping Ash / Broken Hearts when Dragging Left
      if (curState.passIntensity > 0.02) {
        for (const s of sadParticles) {
          s.y += s.speedY * (1 + curState.passIntensity * 1.5);
          s.x += s.speedX;
          s.rotation += s.rotationSpeed;
          if (s.y > height + 30 || s.x < -30) {
            s.y = -30;
            s.x = Math.random() * width + 50;
          }
          drawBrokenHeart(ctx, s.x, s.y, s.size, s.color, s.baseAlpha * curState.passIntensity, s.rotation);
        }
      }

      // 4. Draw Burst Action Particles
      for (let i = burstParticles.length - 1; i >= 0; i--) {
        const p = burstParticles[i];
        p.life = (p.life || 0) + 1;
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += 0.12; // gravity
        p.rotation += p.rotationSpeed;
        const progress = p.life / (p.maxLife || 60);
        const alpha = Math.max(0, 1 - progress);

        if (p.type === 'heart') {
          drawHeart(ctx, p.x, p.y, p.size * (1 + progress * 0.5), p.color, alpha, p.rotation);
        } else if (p.type === 'shattered_shard') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#020617';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-p.size / 2, -p.size / 2);
          ctx.lineTo(p.size / 2, 0);
          ctx.lineTo(0, p.size / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        if (p.life >= (p.maxLife || 60)) {
          burstParticles.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
};
