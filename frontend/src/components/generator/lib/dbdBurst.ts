// frontend/src/components/generator/lib/dbdBurst.ts
import { RoleCategory } from '@/types/perks';

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  rotation: number;
  vr: number;
}

const ROLE_PALETTES: Record<RoleCategory, string[]> = {
  Survivor: ['#10b981', '#34d399', '#f59e0b', '#dc2626'],
  Killer: ['#f43f5e', '#fb7185', '#f59e0b', '#7f1d1d'],
};

let sharedCanvas: HTMLCanvasElement | null = null;
let activeFrame: number | null = null;

function getSharedCanvas(): HTMLCanvasElement {
  if (sharedCanvas && document.body.contains(sharedCanvas)) return sharedCanvas;
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.zIndex = '9999';
  canvas.style.pointerEvents = 'none';
  document.body.appendChild(canvas);
  sharedCanvas = canvas;
  return canvas;
}

/**
 * Fires a short-lived burst of blood-drop/ember particles from a real
 * on-screen point, rather than canvas-confetti's fixed viewport-relative
 * origin (which could land far from the actual result depending on scroll
 * position and viewport size). Replaces the old generic multicolor confetti
 * everywhere in the Randomizer with something that fits the DBD tone.
 *
 * No-ops outside the browser. Callers are responsible for checking
 * prefers-reduced-motion before invoking this (see useJackpotCelebration).
 */
export function triggerDbdBurst(originEl: HTMLElement | null, role: RoleCategory): void {
  if (typeof window === 'undefined') return;

  const canvas = getSharedCanvas();
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = originEl?.getBoundingClientRect();
  const originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const originY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

  const palette = ROLE_PALETTES[role] || ROLE_PALETTES.Survivor;
  const particles: BurstParticle[] = Array.from({ length: 70 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 3;
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: Math.random() * 5 + 2,
      alpha: 1,
      color: palette[Math.floor(Math.random() * palette.length)],
      rotation: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
    };
  });

  if (activeFrame !== null) cancelAnimationFrame(activeFrame);

  const gravity = 0.28;
  const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      if (p.alpha <= 0.02) continue;
      alive = true;
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vr;
      p.alpha *= 0.965;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      // Elongated drip shape instead of a flat confetti rectangle.
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    if (alive) {
      activeFrame = requestAnimationFrame(render);
    } else {
      activeFrame = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  render();
}
