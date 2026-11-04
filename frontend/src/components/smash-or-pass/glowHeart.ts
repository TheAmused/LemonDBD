// frontend/src/components/smash-or-pass/glowHeart.ts
//
// The neon heart the vote effects scatter. A canvas shadow blur is by far the most expensive thing a
// frame can ask for, and dozens of hearts asked for one each, every frame. The glow never changes for
// a given colour, blur and size, so each heart is drawn (glow included) once into a small cached canvas
// and the frame only stamps it, moved, turned and faded.

interface HeartSprite {
  canvas: HTMLCanvasElement;
  /** Where the heart's origin (the notch at its top) sits inside the sprite. */
  originX: number;
  originY: number;
}

/** Sizes share a sprite within this many pixels, so the cache stays small; the stamp scales the rest. */
const SIZE_STEP = 4;
const MAX_SPRITES = 400;
const sprites = new Map<string, HeartSprite>();

function buildSprite(color: string, blur: number, size: number): HeartSprite | null {
  const unit = size / 20;
  const pad = Math.ceil(blur * 1.5) + 2;
  const originX = Math.ceil(13 * unit + pad);
  const originY = Math.ceil(5 * unit + pad);
  const canvas = document.createElement('canvas');
  canvas.width = originX * 2;
  canvas.height = Math.ceil(25 * unit + pad * 2);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.translate(originX, originY);
  ctx.scale(unit, unit);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-10, -10, -20, 5, 0, 20);
  ctx.bezierCurveTo(20, 5, 10, -10, 0, 0);
  ctx.fill();
  return { canvas, originX, originY };
}

/** Draws a glowing heart of `size` (its height) with its origin at (x, y). */
export function drawGlowHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number,
  rotation: number,
  blur: number
): void {
  const bucket = Math.max(SIZE_STEP, Math.round(size / SIZE_STEP) * SIZE_STEP);
  const key = `${color}|${blur}|${bucket}`;
  let sprite = sprites.get(key);
  if (!sprite) {
    if (sprites.size >= MAX_SPRITES) sprites.clear();
    const built = buildSprite(color, blur, bucket);
    if (!built) return;
    sprite = built;
    sprites.set(key, sprite);
  }
  const scale = size / bucket;
  ctx.save();
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.drawImage(sprite.canvas, -sprite.originX, -sprite.originY);
  ctx.restore();
}
