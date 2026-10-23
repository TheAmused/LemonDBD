// frontend/src/components/smash-or-pass/smashBurst.ts
//
// The canvas burst behind a Smash / Super Smash / Pass vote: what it spawns (shockwaves, lightning,
// particles) and how one frame of it is drawn. SmashAnimations only owns the canvas and the timers.
import { themeColor, paletteColor } from '@/utils/themeColor';

export type BurstKind = 'smash' | 'super_smash' | 'pass';

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

interface Burst {
  particles: Particle[];
  shockwaves: Shockwave[];
  lightnings: LightningBolt[];
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

// Rings per kind: [start radius, share of the larger viewport side, speed, colour, line width, alpha, decay].
type RingSpec = [number, number, number, () => string, number, number, number];
const RINGS: Record<BurstKind, RingSpec[]> = {
  super_smash: [
    [10, 0.75, 18, () => themeColor('--accent-amber'), 8, 1.0, 0.02],
    [5, 0.55, 12, () => themeColor('--accent-red'), 5, 0.9, 0.025],
    [0, 0.4, 8, () => themeColor('--text-inverted'), 12, 1.0, 0.04],
  ],
  smash: [
    [10, 0.6, 14, () => themeColor('--accent-red'), 7, 1.0, 0.024],
    [0, 0.45, 9, () => themeColor('--bg-elevated'), 4, 0.8, 0.03],
  ],
  pass: [[5, 0.4, 10, () => themeColor('--text-muted'), 3, 0.7, 0.03]],
};

function createShockwaves(kind: BurstKind, x: number, y: number, width: number, height: number): Shockwave[] {
  return RINGS[kind].map(([radius, reach, speed, color, lineWidth, alpha, decay]) => ({
    x, y, radius, maxRadius: Math.max(width, height) * reach, speed, color: color(), lineWidth, alpha, decay,
  }));
}

/** The twelve electric arcs of a Super Smash. */
function createLightnings(x: number, y: number, width: number, height: number): LightningBolt[] {
  const boltCount = 12;
  return Array.from({ length: boltCount }, (_, b) => {
    const angle = (b / boltCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const dist = Math.min(width, height) * (0.35 + Math.random() * 0.35);
    return {
      segments: createLightningPath(x, y, x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 60, 0.45),
      color: b % 2 === 0 ? themeColor('--accent-amber') : themeColor('--text-inverted'),
      width: Math.random() * 2.5 + 1.5,
      alpha: 1.0,
      decay: 0.035,
    };
  });
}

// Theme palettes: gold for Super Smash, crimson for Smash, ash for Pass.
function burstPalette(kind: BurstKind): string[] {
  if (kind === 'super_smash') {
    return [themeColor('--accent-amber'), paletteColor('amber-500'), themeColor('--accent-amber'), themeColor('--accent-red'), themeColor('--text-muted'), themeColor('--text-inverted')];
  }
  if (kind === 'smash') {
    return [themeColor('--accent-red'), paletteColor('hot-pink'), paletteColor('rose-600'), paletteColor('rose-400'), themeColor('--bg-elevated'), themeColor('--text-inverted')];
  }
  return [themeColor('--text-muted'), paletteColor('zinc-600'), paletteColor('zinc-700'), themeColor('--bg-elevated'), paletteColor('zinc-400'), paletteColor('zinc-950')];
}

const PARTICLE_COUNT: Record<BurstKind, number> = { super_smash: 80, smash: 55, pass: 35 };
// [max extra speed, min speed] per kind.
const PARTICLE_SPEED: Record<BurstKind, [number, number]> = { super_smash: [12, 4], smash: [9, 3], pass: [6, 2] };

function particleType(kind: BurstKind): Particle['type'] {
  const r = Math.random();
  if (kind === 'super_smash') return r < 0.35 ? 'heart' : r < 0.55 ? 'star' : r < 0.75 ? 'lightning_spark' : 'ember';
  if (kind === 'smash') return r < 0.45 ? 'heart' : r < 0.65 ? 'skull' : r < 0.85 ? 'ember' : 'spark';
  return r > 0.4 ? 'skull' : 'spark';
}

function createParticles(kind: BurstKind, x: number, y: number, rapid: boolean): Particle[] {
  const palette = burstPalette(kind);
  const count = rapid ? Math.round(PARTICLE_COUNT[kind] / 2) : PARTICLE_COUNT[kind];
  const [spread, minSpeed] = PARTICLE_SPEED[kind];
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * spread + minSpeed;
    const type = particleType(kind);
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (kind === 'pass' ? -1 : 2.5),
      size: type === 'heart' ? Math.random() * 14 + 10 : type === 'skull' ? Math.random() * 16 + 12 : Math.random() * 6 + 3,
      color: palette[Math.floor(Math.random() * palette.length)],
      alpha: 1.0,
      decay: Math.random() * 0.018 + 0.012,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      type,
      life: 0,
      maxLife: Math.random() * 50 + 40,
      drag: 0.97,
      glow: Math.random() * 15 + 8,
    };
  });
}

/** Everything one vote spawns at (spawnX, spawnY); `rapid` halves the particles. */
export function createBurst(
  triggerType: BurstKind,
  spawnX: number,
  spawnY: number,
  width: number,
  height: number,
  rapid: boolean
): Burst {
  return {
    shockwaves: createShockwaves(triggerType, spawnX, spawnY, width, height),
    lightnings: triggerType === 'super_smash' ? createLightnings(spawnX, spawnY, width, height) : [],
    particles: createParticles(triggerType, spawnX, spawnY, rapid),
  };
}

// Draw stylized neon heart
function drawHeart(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number,
  rotation: number
) {
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
}

// Draw stylized neon skull
function drawSkull(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number,
  rotation: number
) {
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
  context.fillStyle = paletteColor('zinc-950');
  context.beginPath();
  context.arc(-4, -2, 2.5, 0, Math.PI * 2);
  context.arc(4, -2, 2.5, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

// Draw radiant spark / star
function drawSpark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number
) {
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
}

function drawShockwave(ctx: CanvasRenderingContext2D, sw: Shockwave): boolean {
  if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) return false;
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
  return true;
}

function drawLightning(ctx: CanvasRenderingContext2D, bolt: LightningBolt): boolean {
  if (bolt.alpha <= 0) return false;
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
  return true;
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): boolean {
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

  if (p.alpha <= 0) return false;
  if (p.type === 'heart') {
    drawHeart(ctx, p.x, p.y, p.size, p.color, p.alpha, p.rotation);
  } else if (p.type === 'skull') {
    drawSkull(ctx, p.x, p.y, p.size, p.color, p.alpha, p.rotation);
  } else {
    drawSpark(ctx, p.x, p.y, p.size, p.color, p.alpha);
  }
  return true;
}

/** Advances the burst one frame and draws it; false once everything has faded. */
export function renderBurstFrame(ctx: CanvasRenderingContext2D, burst: Burst, width: number, height: number): boolean {
  ctx.clearRect(0, 0, width, height);
  // Every piece is advanced and drawn each frame (no short-circuit), shockwaves first.
  let isAlive = false;
  for (const sw of burst.shockwaves) isAlive = drawShockwave(ctx, sw) || isAlive;
  for (const bolt of burst.lightnings) isAlive = drawLightning(ctx, bolt) || isAlive;
  for (const p of burst.particles) isAlive = drawParticle(ctx, p) || isAlive;
  return isAlive;
}
