// frontend/src/components/smash-or-pass/dragBackgroundScene.ts
//
// The canvas scene behind the Smash or Pass card: ambient embers, the hearts / ash that rain while
// the card is dragged, and the burst after a vote. InteractiveDragBackground owns the canvas, the
// resize listener and the animation loop; this module only builds and draws the scene.
import { themeColor, paletteColor, withAlpha } from '@/utils/themeColor';

export type DragAction = 'smash' | 'pass' | 'super_smash';

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

/** What the loop reads each frame; the intensities ease towards the drag. */
export interface DragState {
  dragX: number;
  dragY: number;
  isDragging: boolean;
  smashIntensity: number;
  passIntensity: number;
  superIntensity: number;
  actionTrigger: DragAction | null;
  triggerKey: number;
  isPaused: boolean;
  /** The ambient embers; off follows the Settings campfire switch. */
  showEmbers: boolean;
}

interface Scene {
  embers: Particle[];
  smashHearts: Particle[];
  sadParticles: Particle[];
  burstParticles: Particle[];
  pinkPalette: string[];
}

const pick = (palette: string[]) => palette[Math.floor(Math.random() * palette.length)];

/** The ambient pools, scattered over a `width` x `height` canvas. */
export function createScene(width: number, height: number): Scene {
  const pinkPalette = [themeColor('--accent-red'), paletteColor('red-500'), paletteColor('red-400'), paletteColor('red-700'), paletteColor('red-300'), paletteColor('rose-600')];
  const sadPalette = [themeColor('--text-muted'), paletteColor('zinc-600'), paletteColor('zinc-700'), themeColor('--bg-elevated'), paletteColor('zinc-400'), themeColor('--bg-primary')];

  // Baseline ambient embers
  const embers: Particle[] = Array.from({ length: 28 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 3 + 1,
    speedY: -(Math.random() * 0.4 + 0.15),
    speedX: (Math.random() - 0.5) * 0.3,
    alpha: Math.random() * 0.4 + 0.1,
    baseAlpha: Math.random() * 0.4 + 0.1,
    color: Math.random() > 0.5 ? themeColor('--accent-red') : paletteColor('amber-500'),
    type: 'ember',
    rotation: 0,
    rotationSpeed: 0,
  }));

  // Smash hearts, falling while the card is dragged right
  const smashHearts: Particle[] = Array.from({ length: 40 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 16 + 8,
    speedY: Math.random() * 1.5 + 0.8, // falling down
    speedX: (Math.random() - 0.5) * 0.5,
    alpha: 0,
    baseAlpha: Math.random() * 0.6 + 0.2,
    color: pick(pinkPalette),
    type: 'heart',
    rotation: (Math.random() - 0.5) * 0.5,
    rotationSpeed: (Math.random() - 0.5) * 0.015,
  }));

  // Sad ash / broken-heart rain while it is dragged left
  const sadParticles: Particle[] = Array.from({ length: 35 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 12 + 6,
    speedY: Math.random() * 2.0 + 1.0, // heavy falling rain
    speedX: -0.8 - Math.random() * 0.5, // slanting left
    alpha: 0,
    baseAlpha: Math.random() * 0.5 + 0.2,
    color: pick(sadPalette),
    type: 'sad_ash',
    rotation: (Math.random() - 0.5) * 0.8,
    rotationSpeed: (Math.random() - 0.5) * 0.02,
  }));

  return { embers, smashHearts, sadParticles, burstParticles: [], pinkPalette };
}

/** Adds the burst a vote of `action` sets off at the centre of the canvas. */
export function spawnActionBurst(scene: Scene, action: DragAction, centerX: number, centerY: number): void {
  const burst = scene.burstParticles;
  if (action === 'smash') {
    for (let i = 0; i < 45; i++) {
      const angle = (Math.PI * 2 * i) / 45 + (Math.random() - 0.5) * 0.3;
      const spd = Math.random() * 8 + 3;
      burst.push({
        x: centerX, y: centerY, size: Math.random() * 20 + 10,
        speedX: Math.cos(angle) * spd, speedY: Math.sin(angle) * spd - 1,
        alpha: 1, baseAlpha: 1, color: pick(scene.pinkPalette), type: 'heart',
        rotation: Math.random() * Math.PI, rotationSpeed: (Math.random() - 0.5) * 0.1, life: 0, maxLife: 60,
      });
    }
  } else if (action === 'pass') {
    // Shattered black dissolving shards
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 6 + 1.5;
      burst.push({
        x: centerX + (Math.random() - 0.5) * 40, y: centerY + (Math.random() - 0.5) * 40, size: Math.random() * 16 + 6,
        speedX: Math.cos(angle) * spd, speedY: Math.sin(angle) * spd + 2.5, // dropping heavy
        alpha: 1, baseAlpha: 1, color: themeColor('--bg-primary'), type: 'shattered_shard',
        rotation: Math.random() * Math.PI, rotationSpeed: (Math.random() - 0.5) * 0.2, life: 0, maxLife: 55,
      });
    }
  } else {
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 10 + 4;
      burst.push({
        x: centerX, y: centerY, size: Math.random() * 22 + 8,
        speedX: Math.cos(angle) * spd, speedY: Math.sin(angle) * spd - 3,
        alpha: 1, baseAlpha: 1, color: Math.random() > 0.3 ? themeColor('--accent-amber') : paletteColor('amber-500'), type: 'heart',
        rotation: Math.random() * Math.PI, rotationSpeed: (Math.random() - 0.5) * 0.15, life: 0, maxLife: 70,
      });
    }
  }
}

/** Eases each intensity towards what the current drag asks for. */
export function updateIntensities(state: DragState): void {
  const targetSmash = state.dragX > 20 ? Math.min(1, (state.dragX - 20) / 75) : 0;
  const targetPass = state.dragX < -20 ? Math.min(1, (Math.abs(state.dragX) - 20) / 75) : 0;
  const targetSuper = state.dragY < -30 ? Math.min(1, (Math.abs(state.dragY) - 30) / 75) : 0;
  state.smashIntensity += (targetSmash - state.smashIntensity) * 0.12;
  state.passIntensity += (targetPass - state.passIntensity) * 0.12;
  state.superIntensity += (targetSuper - state.superIntensity) * 0.12;
}

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
  context.shadowBlur = 10;

  context.beginPath();
  context.moveTo(0, 0);
  context.bezierCurveTo(-10, -10, -20, 5, 0, 20);
  context.bezierCurveTo(20, 5, 10, -10, 0, 0);
  context.fill();
  context.restore();
}

function drawBrokenHeart(
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
  context.strokeStyle = themeColor('--bg-primary');
  context.lineWidth = 2;

  context.beginPath();
  context.moveTo(0, 0);
  context.bezierCurveTo(-10, -10, -20, 5, 0, 20);
  context.bezierCurveTo(20, 5, 10, -10, 0, 0);
  context.fill();
  context.stroke();

  // Jagged crack down center
  context.strokeStyle = themeColor('--bg-elevated');
  context.beginPath();
  context.moveTo(0, -5);
  context.lineTo(-2, 4);
  context.lineTo(3, 10);
  context.lineTo(0, 20);
  context.stroke();

  context.restore();
}

function drawShard(ctx: CanvasRenderingContext2D, p: Particle, alpha: number) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = themeColor('--bg-primary');
  ctx.strokeStyle = paletteColor('zinc-600');
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

/** A soft radial glow on the side the card leans to (smash right, pass left). */
function drawAmbientGlow(ctx: CanvasRenderingContext2D, state: DragState, width: number, height: number) {
  const side = state.smashIntensity > 0.01 ? 'smash' : state.passIntensity > 0.01 ? 'pass' : null;
  if (!side) return;
  const cx = width * (side === 'smash' ? 0.7 : 0.3);
  const grad = ctx.createRadialGradient(cx, height * 0.5, 50, cx, height * 0.5, Math.max(width, height) * 0.6);
  if (side === 'smash') {
    grad.addColorStop(0, withAlpha(paletteColor('red-600'), state.smashIntensity * 0.18));
    grad.addColorStop(0.5, withAlpha(paletteColor('red-700'), state.smashIntensity * 0.08));
  } else {
    grad.addColorStop(0, withAlpha(paletteColor('zinc-950'), state.passIntensity * 0.3));
    grad.addColorStop(0.5, withAlpha(paletteColor('zinc-800'), state.passIntensity * 0.15));
  }
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function drawEmbers(ctx: CanvasRenderingContext2D, embers: Particle[], width: number, height: number) {
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
}

function drawDragRain(ctx: CanvasRenderingContext2D, scene: Scene, state: DragState, width: number, height: number) {
  // Falling smash hearts when dragging right
  if (state.smashIntensity > 0.02) {
    for (const h of scene.smashHearts) {
      h.y += h.speedY * (1 + state.smashIntensity * 1.5);
      h.x += h.speedX;
      h.rotation += h.rotationSpeed;
      if (h.y > height + 30) {
        h.y = -30;
        h.x = Math.random() * width;
      }
      drawHeart(ctx, h.x, h.y, h.size, h.color, h.baseAlpha * state.smashIntensity, h.rotation);
    }
  }
  // Weeping ash / broken hearts when dragging left
  if (state.passIntensity > 0.02) {
    for (const s of scene.sadParticles) {
      s.y += s.speedY * (1 + state.passIntensity * 1.5);
      s.x += s.speedX;
      s.rotation += s.rotationSpeed;
      if (s.y > height + 30 || s.x < -30) {
        s.y = -30;
        s.x = Math.random() * width + 50;
      }
      drawBrokenHeart(ctx, s.x, s.y, s.size, s.color, s.baseAlpha * state.passIntensity, s.rotation);
    }
  }
}

function drawBurst(ctx: CanvasRenderingContext2D, burst: Particle[]) {
  for (let i = burst.length - 1; i >= 0; i--) {
    const p = burst[i];
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
      drawShard(ctx, p, alpha);
    }

    if (p.life >= (p.maxLife || 60)) {
      burst.splice(i, 1);
    }
  }
}

/** Draws one frame: glow, embers (unless switched off), the drag rain, then any vote burst. */
export function drawScene(ctx: CanvasRenderingContext2D, scene: Scene, state: DragState, width: number, height: number): void {
  ctx.clearRect(0, 0, width, height);
  drawAmbientGlow(ctx, state, width, height);
  if (state.showEmbers) drawEmbers(ctx, scene.embers, width, height);
  drawDragRain(ctx, scene, state, width, height);
  drawBurst(ctx, scene.burstParticles);
}
