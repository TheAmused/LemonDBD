// frontend/src/components/generator/lib/scatterPoints.ts
// Where the Loot Crate perks land on a phone: spread over the whole field, but never on top of each other.

/** The scatter field of a phone: its size in px and the perk it has to hold. */
export interface PhoneScatterField {
  width: number;
  height: number;
  /** Width of one perk on this screen (the `compact` size plus its padding). */
  itemPx: number;
  /** How far a perk's centre stays from the field's edge, so the whole perk is inside. */
  marginPx: number;
  /** Least distance between two perk centres. The icons are diamonds with empty corners, so this is a touch under the perk width. */
  minGapPx: number;
}

/** Sizes the field from the screen: as wide as the stage allows and about 62% of the screen tall. */
export function phoneScatterField(viewportW: number, viewportH: number): PhoneScatterField {
  const itemPx = viewportW < 400 ? 92 : viewportW < 640 ? 100 : 116;
  const framePad = viewportW < 640 ? 16 : 40;
  const maxWidth = viewportW < 640 ? 448 : 576;
  return {
    width: Math.min(viewportW - framePad, maxWidth),
    height: Math.round(Math.min(Math.max(viewportH * 0.62, 480), 760)),
    itemPx,
    marginPx: itemPx / 2 + 4,
    minGapPx: Math.round(itemPx * 0.94),
  };
}

export interface ScatterPoint {
  /** Percent of the field width / height. */
  x: number;
  y: number;
}

const CANDIDATES_PER_POINT = 12;
const MAX_PASSES = 300;

/**
 * Points over the whole field with no grid: each one is the farthest from the points already placed out of a dozen
 * random tries, so they fill the field instead of piling up. Then a control pass pushes apart every pair closer
 * than `minGapPx` (and keeps all of them inside the edge margin) until none is left, so the one you want is always
 * easy to tap.
 */
export function chaosPoints(count: number, field: PhoneScatterField, random: () => number = Math.random): ScatterPoint[] {
  const { width, height, marginPx, minGapPx } = field;
  const innerW = Math.max(0, width - 2 * marginPx);
  const innerH = Math.max(0, height - 2 * marginPx);
  const px: { x: number; y: number }[] = [];

  for (let i = 0; i < count; i++) {
    let best = { x: marginPx + random() * innerW, y: marginPx + random() * innerH };
    let bestGap = px.length === 0 ? Infinity : Math.min(...px.map((p) => Math.hypot(best.x - p.x, best.y - p.y)));
    for (let k = 1; k < CANDIDATES_PER_POINT && px.length > 0; k++) {
      const candidate = { x: marginPx + random() * innerW, y: marginPx + random() * innerH };
      const gap = Math.min(...px.map((p) => Math.hypot(candidate.x - p.x, candidate.y - p.y)));
      if (gap > bestGap) {
        best = candidate;
        bestGap = gap;
      }
    }
    px.push(best);
  }

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let moved = false;
    for (let i = 0; i < px.length; i++) {
      for (let j = i + 1; j < px.length; j++) {
        let dx = px[j].x - px[i].x;
        let dy = px[j].y - px[i].y;
        let dist = Math.hypot(dx, dy);
        if (dist >= minGapPx) continue;
        if (dist < 1e-6) {
          const angle = random() * 2 * Math.PI;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          dist = 1;
        }
        const push = (minGapPx - dist) / 2 + 0.01;
        px[i].x -= (dx / dist) * push;
        px[i].y -= (dy / dist) * push;
        px[j].x += (dx / dist) * push;
        px[j].y += (dy / dist) * push;
        moved = true;
      }
    }
    for (const p of px) {
      p.x = Math.min(width - marginPx, Math.max(marginPx, p.x));
      p.y = Math.min(height - marginPx, Math.max(marginPx, p.y));
    }
    if (!moved) break;
  }

  return px.map((p) => ({ x: (p.x / width) * 100, y: (p.y / height) * 100 }));
}
