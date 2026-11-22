// frontend/src/utils/mapLayout.ts
/**
 * Geometry for a map's drawn footprint (`MapRealm.layout`): outline rings in metres, traced
 * from the current wiki.gg outline on the 8 m (sqT) grid. Everything the map view draws on top
 * -- the 8 m squares, the 16 m game tiles and the 12-clock callouts -- is computed here from
 * that outline, so the view itself only paints.
 */
import type { MapLandmark, MapLayout, MapLayoutFloor, MapPoint, MapRoom } from '@/types/map';

/** One game tile is a 2x2 block of 8 m squares. */
export const GAME_TILE_M = 16;
/** Clear floor every clock number keeps around it, in metres (labels are ~6 m tall). */
const CLOCK_CLEARANCE_M = 4;
/** Ray-march step when looking for the edge of the map, in metres. */
const RAY_STEP_M = 0.5;

/** Even-odd test: is (x, y) inside the ring? Rings are implicitly closed. */
export function pointInRing(x: number, y: number, ring: readonly MapPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Is (x, y) playable floor: inside an outline ring, outside every hole and every blocked ring? */
export function pointOnFloor(floor: MapLayoutFloor, x: number, y: number): boolean {
  if (!floor.outline.some((ring) => pointInRing(x, y, ring))) return false;
  if ((floor.holes ?? []).some((ring) => pointInRing(x, y, ring))) return false;
  return !(floor.blocked ?? []).some((ring) => pointInRing(x, y, ring));
}

/** SVG path data for a set of rings. */
export function ringsToPath(rings: readonly (readonly MapPoint[])[]): string {
  return rings
    .filter((ring) => ring.length >= 3)
    .map((ring) => `M${ring.map(([x, y]) => `${x} ${y}`).join('L')}Z`)
    .join('');
}

export interface FloorBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function floorBounds(floor: MapLayoutFloor): FloorBounds {
  const points = floor.outline.flat();
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return {
    minX: Math.min(...points.map((p) => p[0])),
    minY: Math.min(...points.map((p) => p[1])),
    maxX: Math.max(...points.map((p) => p[0])),
    maxY: Math.max(...points.map((p) => p[1])),
  };
}

/** The 8 m squares whose centre is on the floor, as [column, row] pairs. */
export function floorSquares(layout: MapLayout, floor: MapLayoutFloor): Array<[number, number]> {
  const cell = layout.cell_m;
  const cols = Math.ceil(layout.width_m / cell);
  const rows = Math.ceil(layout.height_m / cell);
  const squares: Array<[number, number]> = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (pointOnFloor(floor, (col + 0.5) * cell, (row + 0.5) * cell)) squares.push([col, row]);
    }
  }
  return squares;
}

/**
 * The 12-clock hour of a point seen from the centre: 12 straight up, then clockwise, each hour
 * a 30 degree slice centred on its number.
 */
export function clockHourAt(cx: number, cy: number, x: number, y: number): number {
  let degrees = (Math.atan2(x - cx, -(y - cy)) * 180) / Math.PI;
  if (degrees < 0) degrees += 360;
  const hour = Math.round(degrees / 30) % 12;
  return hour === 0 ? 12 : hour;
}

/** Is the floor clear for `m` metres around (x, y) in all eight directions? */
function hasClearance(floor: MapLayoutFloor, x: number, y: number, m: number): boolean {
  const d = m * Math.SQRT1_2;
  const probes: MapPoint[] = [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m], [d, d], [d, -d], [-d, d], [-d, -d]];
  return probes.every(([px, py]) => pointOnFloor(floor, x + px, y + py));
}

/** Is the floor clear across a rectangular label box (`hw` x `hh` half-extents) around (x, y)? */
function hasBoxClearance(floor: MapLayoutFloor, x: number, y: number, hw: number, hh: number): boolean {
  const probes: MapPoint[] = [
    [0, 0],
    [hw, 0],
    [-hw, 0],
    [0, hh],
    [0, -hh],
    [hw, hh],
    [hw, -hh],
    [-hw, hh],
    [-hw, -hh],
  ];
  return probes.every(([px, py]) => pointOnFloor(floor, x + px, y + py));
}

export interface ClockLabel {
  hour: number;
  x: number;
  y: number;
}

/** Clear space a clock number keeps from a landmark's footprint or marker, in metres. */
const LANDMARK_CLEARANCE_M = 4;
/** Angles tried within an hour's sector when its own direction misses the floor, in degrees. */
const SECTOR_OFFSETS = [0, 5, -5, 10, -10, 14, -14];
/** On a floor with named rooms the numbers would sit on the names: they are printed this far outside the outline. */
const OUTSIDE_M = 5;
/** MID needs less clear floor on such a floor: its corridors are narrow. */
const ROOMS_CLEARANCE_M = 2;
/** Half the size of a landmark drawn as a marker (no footprint), in metres. */
const MARKER_HALF_M = 4.5;

/** The box a room's name takes, so clock numbers keep clear of it like of a landmark. */
export function roomBox(room: MapRoom): Pick<MapLandmark, 'x' | 'y' | 'w' | 'h'> {
  const ring = room.ring;
  if (!ring || ring.length === 0) return { x: room.x ?? 0, y: room.y ?? 0, w: room.w ?? 12, h: room.h ?? 4 };
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  return {
    x: room.x ?? (Math.min(...xs) + Math.max(...xs)) / 2,
    y: room.y ?? (Math.min(...ys) + Math.max(...ys)) / 2,
    w: Math.min(Math.max(...xs) - Math.min(...xs), 14),
    h: Math.min(Math.max(...ys) - Math.min(...ys), 6),
  };
}

/** Distance from (x, y) to a landmark's footprint (its rotated bounding box) or marker; 0 inside. */
export function distanceToLandmark(lm: Pick<MapLandmark, 'x' | 'y' | 'w' | 'h' | 'angle'>, x: number, y: number): number {
  let hw = MARKER_HALF_M;
  let hh = MARKER_HALF_M;
  if (lm.w && lm.h) {
    const a = ((lm.angle ?? 0) * Math.PI) / 180;
    hw = (Math.abs(lm.w * Math.cos(a)) + Math.abs(lm.h * Math.sin(a))) / 2;
    hh = (Math.abs(lm.w * Math.sin(a)) + Math.abs(lm.h * Math.cos(a))) / 2;
  }
  const dx = Math.max(Math.abs(x - lm.x) - hw, 0);
  const dy = Math.max(Math.abs(y - lm.y) - hh, 0);
  return Math.hypot(dx, dy);
}

/**
 * Where to print each clock number: walk out from the centre of the floor's bounding box along
 * the hour's direction to the last point still on the floor, then step back inside until the
 * number has clear floor around it (no edge, corner, notch or blocked area underneath) and does
 * not sit on a landmark. `showMid` is false when the centre is off the floor or under a landmark.
 */
export function clockLabels(floor: MapLayoutFloor): { center: MapPoint; labels: ClockLabel[]; showMid: boolean } {
  const b = floorBounds(floor);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const reach = Math.hypot(b.maxX - b.minX, b.maxY - b.minY);
  const rooms = floor.rooms ?? [];
  const landmarks = [...(floor.landmarks ?? []), ...rooms.map(roomBox)];
  const clearance = rooms.length > 0 ? ROOMS_CLEARANCE_M : CLOCK_CLEARANCE_M;
  const inOutline = (x: number, y: number) => floor.outline.some((ring) => pointInRing(x, y, ring));
  const clearOfLandmarks = (x: number, y: number) =>
    landmarks.every((lm) => distanceToLandmark(lm, x, y) >= LANDMARK_CLEARANCE_M);
  const showMid = hasClearance(floor, cx, cy, clearance) && clearOfLandmarks(cx, cy);
  if (floor.clock && floor.clock.length > 0) {
    return { center: [cx, cy], labels: floor.clock, showMid };
  }
  // Place one number along a ray from the centre (used for room-based maps where numbers sit outside).
  const placeOutside = (degrees: number): MapPoint | null => {
    const angle = (degrees * Math.PI) / 180;
    const dx = Math.sin(angle);
    const dy = -Math.cos(angle);
    let lastInside = -1;
    let lastInOutline = -1;
    for (let r = 0; r <= reach; r += RAY_STEP_M) {
      if (pointOnFloor(floor, cx + dx * r, cy + dy * r)) lastInside = r;
      if (inOutline(cx + dx * r, cy + dy * r)) lastInOutline = r;
    }
    if (lastInside < 0) return null;
    // Beyond the last point of the outline itself: a blocked room at the edge is no reason to stop short.
    const out = Math.max(lastInOutline, lastInside) + OUTSIDE_M;
    return [cx + dx * out, cy + dy * out];
  };

  const labels: ClockLabel[] = [];
  if (rooms.length > 0 || floor.outline.length === 0 || floor.outline[0].length < 3) {
    for (let hour = 1; hour <= 12; hour++) {
      let point: MapPoint | null = null;
      for (const offset of SECTOR_OFFSETS) {
        point = placeOutside(hour * 30 + offset);
        if (point) break;
      }
      if (point) labels.push({ hour, x: point[0], y: point[1] });
    }
  } else {
    // Non-room maps: anchor 12, 3, 6, 9 at cardinal ray hits from centre, then space intermediate
    // hours evenly along the perimeter between them so asymmetric maps match competitive callouts.
    const ring = [...floor.outline[0]];
    const n = ring.length;
    let area = 0;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = ring[i];
      const [x1, y1] = ring[(i + 1) % n];
      area += x0 * y1 - x1 * y0;
    }
    if (area < 0) ring.reverse();

    const segs: Array<{ p0: MapPoint; p1: MapPoint; len: number; start: number }> = [];
    let total = 0;
    for (let i = 0; i < n; i++) {
      const p0 = ring[i];
      const p1 = ring[(i + 1) % n];
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      if (len > 0) {
        segs.push({ p0, p1, len, start: total });
        total += len;
      }
    }

    const rayParam = (dx: number, dy: number): number => {
      let bestR = -1;
      let bestD = 0;
      for (const { p0, p1, len, start } of segs) {
        const sx = p1[0] - p0[0];
        const sy = p1[1] - p0[1];
        const denom = dx * sy - dy * sx;
        if (Math.abs(denom) < 1e-9) continue;
        const qx = p0[0] - cx;
        const qy = p0[1] - cy;
        const r = (qx * sy - qy * sx) / denom;
        const t = (qx * dy - qy * dx) / denom;
        if (r > 0 && t >= -1e-6 && t <= 1 + 1e-6 && r > bestR) {
          bestR = r;
          bestD = start + Math.max(0, Math.min(1, t)) * len;
        }
      }
      return bestD;
    };

    const d12 = rayParam(0, -1);
    const d3 = rayParam(1, 0);
    const d6 = rayParam(0, 1);
    const d9 = rayParam(-1, 0);
    const arc = (a: number, b: number) => (((b - a) % total) + total) % total;
    const anchors: Array<[number, number]> = [
      [1, (d12 + arc(d12, d3) / 3) % total],
      [2, (d12 + (2 * arc(d12, d3)) / 3) % total],
      [3, d3],
      [4, (d3 + arc(d3, d6) / 3) % total],
      [5, (d3 + (2 * arc(d3, d6)) / 3) % total],
      [6, d6],
      [7, (d6 + arc(d6, d9) / 3) % total],
      [8, (d6 + (2 * arc(d6, d9)) / 3) % total],
      [9, d9],
      [10, (d9 + arc(d9, d12) / 3) % total],
      [11, (d9 + (2 * arc(d9, d12)) / 3) % total],
      [12, d12],
    ];

    const atArc = (rawD: number): [number, number, number, number] => {
      const d = ((rawD % total) + total) % total;
      for (const { p0, p1, len, start } of segs) {
        if (d >= start && d <= start + len + 1e-9) {
          const t = (d - start) / len;
          return [
            p0[0] + (p1[0] - p0[0]) * t,
            p0[1] + (p1[1] - p0[1]) * t,
            -(p1[1] - p0[1]) / len,
            (p1[0] - p0[0]) / len,
          ];
        }
      }
      return [cx, cy, 0, 0];
    };

    for (const [hour, d] of anchors) {
      const hw = hour >= 10 ? 5.5 : 4.0;
      const hh = 4.5;
      const farFromPlaced = (tx: number, ty: number) =>
        labels.every((prev) => Math.hypot(tx - prev.x, ty - prev.y) >= 11);
      let best: MapPoint | null = null;
      for (const dOff of [0, 5, -5, 10, -10, 15, -15]) {
        const [ex, ey, nx, ny] = atArc(d + dOff);
        for (const inset of [7, 8.5, 10, 12, 14, 5.5]) {
          const tx = ex + nx * inset;
          const ty = ey + ny * inset;
          if (hasBoxClearance(floor, tx, ty, hw, hh) && clearOfLandmarks(tx, ty) && farFromPlaced(tx, ty)) {
            best = [tx, ty];
            break;
          }
        }
        if (best) break;
      }
      if (!best) {
        const [ex, ey] = atArc(d);
        const dx = cx - ex;
        const dy = cy - ey;
        const dl = Math.hypot(dx, dy) || 1;
        for (const inset of [7, 9, 11, 13, 15, 18, 5]) {
          const tx = ex + (dx / dl) * inset;
          const ty = ey + (dy / dl) * inset;
          if (hasBoxClearance(floor, tx, ty, hw, hh)) {
            best = [tx, ty];
            break;
          }
        }
        if (!best) {
          for (const inset of [7, 5, 9, 3]) {
            const tx = ex + (dx / dl) * inset;
            const ty = ey + (dy / dl) * inset;
            if (pointOnFloor(floor, tx, ty)) {
              best = [tx, ty];
              break;
            }
          }
        }
      }
      labels.push({ hour, x: best?.[0] ?? cx, y: best?.[1] ?? cy });
    }
  }
  return { center: [cx, cy], labels, showMid };
}

/** Same frame as MapLayoutView's thumbnails, so map pictures compare by size everywhere. */
const PICTURE_FRAME_M = 152;

/**
 * A map's outline as a self-contained SVG data URI, for places that take a picture URL rather
 * than a component (tier-list items). Neutral colours that read on light and dark surfaces.
 */
export function layoutPictureDataUri(layout: MapLayout): string {
  const floor = layout.floors[0];
  const b = floorBounds(floor);
  const x0 = (b.minX + b.maxX) / 2 - PICTURE_FRAME_M / 2;
  const y0 = (b.minY + b.maxY) / 2 - PICTURE_FRAME_M / 2;
  const blocked = floor.blocked?.length ? `<path d="${ringsToPath(floor.blocked)}" fill="#8b8f98" fill-opacity="0.45"/>` : '';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${PICTURE_FRAME_M} ${PICTURE_FRAME_M}">` +
    `<path d="${ringsToPath([...floor.outline, ...(floor.holes ?? [])])}" fill-rule="evenodd" fill="#e5484d" fill-opacity="0.22" stroke="#e5484d" stroke-width="2.5" stroke-linejoin="round"/>` +
    `${blocked}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
