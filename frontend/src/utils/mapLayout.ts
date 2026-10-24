// frontend/src/utils/mapLayout.ts
/**
 * Geometry for a map's drawn footprint (`MapRealm.layout`): outline rings in metres, traced
 * from the current wiki.gg outline on the 8 m (sqT) grid. Everything the map view draws on top
 * -- the 8 m squares, the 16 m game tiles and the 12-clock callouts -- is computed here from
 * that outline, so the view itself only paints.
 */
import type { MapLandmark, MapLayout, MapLayoutFloor, MapPoint } from '@/types/map';

/** One game tile is a 2x2 block of 8 m squares. */
export const GAME_TILE_M = 16;
/** How far inside the edge a clock number sits, in metres. */
const CLOCK_INSET_M = 7;
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

/** Is (x, y) playable floor: inside an outline ring and outside every blocked ring? */
export function pointOnFloor(floor: MapLayoutFloor, x: number, y: number): boolean {
  if (!floor.outline.some((ring) => pointInRing(x, y, ring))) return false;
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

export interface ClockLabel {
  hour: number;
  x: number;
  y: number;
}

/** Clear space a clock number keeps from a landmark's footprint or marker, in metres. */
const LANDMARK_CLEARANCE_M = 4;
/** Angles tried within an hour's sector when its own direction misses the floor, in degrees. */
const SECTOR_OFFSETS = [0, 5, -5, 10, -10, 14, -14];
/** How much further inwards a clock number may move to clear a landmark, in metres. */
const LANDMARK_SEARCH_M = 10;
/** Half the size of a landmark drawn as a marker (no footprint), in metres. */
const MARKER_HALF_M = 4.5;

/** Distance from (x, y) to a landmark's footprint (its rotated bounding box) or marker; 0 inside. */
export function distanceToLandmark(lm: MapLandmark, x: number, y: number): number {
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
  const landmarks = floor.landmarks ?? [];
  const clearOfLandmarks = (x: number, y: number) =>
    landmarks.every((lm) => distanceToLandmark(lm, x, y) >= LANDMARK_CLEARANCE_M);
  // Place one number along a ray from the centre; null when the ray never touches the floor.
  const place = (degrees: number): MapPoint | null => {
    const angle = (degrees * Math.PI) / 180;
    const dx = Math.sin(angle);
    const dy = -Math.cos(angle);
    let lastInside = -1;
    for (let r = 0; r <= reach; r += RAY_STEP_M) {
      if (pointOnFloor(floor, cx + dx * r, cy + dy * r)) lastInside = r;
    }
    if (lastInside < 0) return null;
    const start = Math.max(0, lastInside - CLOCK_INSET_M);
    let edgeSafe: number | null = null;
    let best: number | null = null;
    // Only look a short way further in for a spot clear of landmarks: a number pushed deep inside
    // reads as a different sector. Otherwise it stays by the edge, drawn on top of the footprint.
    const stop = Math.max(0, start - LANDMARK_SEARCH_M);
    for (let r = start; r >= stop && best === null; r -= RAY_STEP_M) {
      const x = cx + dx * r;
      const y = cy + dy * r;
      if (!hasClearance(floor, x, y, CLOCK_CLEARANCE_M)) continue;
      edgeSafe ??= r;
      if (clearOfLandmarks(x, y)) best = r;
    }
    for (let r = stop; edgeSafe === null && r >= 0; r -= RAY_STEP_M) {
      if (hasClearance(floor, cx + dx * r, cy + dy * r, CLOCK_CLEARANCE_M)) edgeSafe = r;
    }
    // Narrow spots with no clearance anywhere along the ray: the last point that is on the floor.
    const r = best ?? edgeSafe ?? lastInside;
    return [cx + dx * r, cy + dy * r];
  };
  const labels: ClockLabel[] = [];
  for (let hour = 1; hour <= 12; hour++) {
    // The hour's own direction first, then nearby ones inside its 30 degree sector (odd shapes whose
    // centre sits in a notch can miss the floor in exactly that direction).
    let point: MapPoint | null = null;
    for (const offset of SECTOR_OFFSETS) {
      point = place(hour * 30 + offset);
      if (point) break;
    }
    if (point) labels.push({ hour, x: point[0], y: point[1] });
  }
  const showMid = hasClearance(floor, cx, cy, CLOCK_CLEARANCE_M) && clearOfLandmarks(cx, cy);
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
    `<path d="${ringsToPath(floor.outline)}" fill="#e5484d" fill-opacity="0.22" stroke="#e5484d" stroke-width="2.5" stroke-linejoin="round"/>` +
    `${blocked}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
