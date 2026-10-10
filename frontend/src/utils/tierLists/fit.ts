// frontend/src/utils/tierLists/fit.ts
//
// Sizes the whole tier board to the room it has, so every tier and the unranked
// pool are on screen at once with no scroll box of their own. The board is
// measured, then this picks the largest tile (and the label column, gaps and
// fonts that scale with it) whose rows still fit. Small screens get small
// tiles, large ones big tiles, and a nearly empty list is capped by `maxTile`
// instead of ballooning.
//
// Pure arithmetic on purpose: no DOM reads, so it is testable and cannot
// feed back into the layout it measures. The numbers mirror the classes in
// TierRow / TierItemTile / TierPool (borders, line-height, padding) -- change
// one side and `tierListFit.test.ts` plus `scripts/verify-tier-lists-fit.mjs`
// will say which.

export type FitShape = 'square' | 'wide';

export interface FitInput {
  /** Board box, in CSS px. */
  width: number;
  height: number;
  /** Items currently in each tier, top to bottom. */
  tierCounts: readonly number[];
  /** Items in the unranked pool. */
  poolCount: number;
  shape: FitShape;
  showNames: boolean;
  poolCollapsed: boolean;
  /** Measured height of the pool's header strip (search + title + toggle). */
  poolHeadHeight: number;
}

export interface FitResult {
  /** Image size: the tile's height, and its width when square. */
  tile: number;
  tileWidth: number;
  gap: number;
  pad: number;
  rowGap: number;
  /** Item-name font size under a tile. */
  nameFont: number;
  /** Width of the colored tier label column, and its font size. */
  badgeWidth: number;
  badgeFont: number;
  /** Minimum height of a row's tile area when it has nothing in it (the border is on top of this). */
  rowMin: number;
  /** Floor and ceiling of the pool's scrolling body. */
  poolMinBody: number;
  poolMaxBody: number;
  /** The same bounds for the whole pool panel (header and borders included). */
  poolMinTotal: number;
  poolMaxTotal: number;
  /** True when even the smallest tile does not fit: the rows fall back to scrolling. */
  overflow: boolean;
  /** True when item names were switched off to buy a bigger tile (the user's setting is untouched). */
  namesHidden: boolean;
}

export const MIN_TILE = 18;
/** With names on, a tile smaller than this is not worth it: dropping the labels gives a bigger, readable image instead. */
export const NAMES_MIN_TILE = 44;
const MAX_TILE = 128;
/** Wide (map) tiles are this much wider than tall. */
const WIDE_RATIO = 1.5;
/** Space between the rows block and the pool (the board's `gap-3`). */
const SECTION_GAP = 12;
/** Border of a tier row / the pool (1px on each side). */
const BORDER = 2;
/** Room a classic scrollbar takes inside the pool, plus one px of rounding safety. */
const POOL_SCROLLBAR = 16;
const EMPTY_POOL_BODY = 44;
/** Share of the board the pool may take before it scrolls. */
const POOL_SHARE = 0.45;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The biggest tile this much room could ever want: grows with the screen, never past MAX_TILE. */
export function maxTileFor(width: number, height: number): number {
  return clamp(Math.round(Math.min(width * 0.062, height * 0.125)), 44, MAX_TILE);
}

export interface TileMetrics {
  tile: number;
  tileWidth: number;
  cellHeight: number;
  gap: number;
  pad: number;
  rowGap: number;
  nameFont: number;
  badgeWidth: number;
  badgeFont: number;
}

export function metricsFor(tile: number, shape: FitShape, showNames: boolean): TileMetrics {
  const nameFont = clamp(Math.round(tile * 0.17), 9, 15);
  // A name is at most two lines of `leading-tight` (1.25), under a 4px gap.
  const nameBlock = showNames ? 4 + Math.ceil(2 * 1.25 * nameFont) : 0;
  return {
    tile,
    tileWidth: shape === 'wide' ? Math.round(tile * WIDE_RATIO) : tile,
    cellHeight: tile + nameBlock,
    gap: clamp(Math.round(tile * 0.07), 2, 8),
    pad: clamp(Math.round(tile * 0.1), 3, 12),
    rowGap: clamp(Math.round(tile * 0.07), 2, 8),
    nameFont,
    badgeWidth: clamp(Math.round(tile * 1.1), 40, 144),
    badgeFont: clamp(Math.round(tile * 0.4), 14, 56),
  };
}

/** How many wrapped lines `count` tiles take in `innerWidth`. At least one. */
export function linesFor(count: number, innerWidth: number, m: TileMetrics): number {
  if (count <= 0) return 1;
  const perLine = Math.max(1, Math.floor((innerWidth + m.gap) / (m.tileWidth + m.gap)));
  return Math.ceil(count / perLine);
}

function blockHeight(lines: number, m: TileMetrics): number {
  return lines * m.cellHeight + (lines - 1) * m.gap + 2 * m.pad;
}

export function rowHeight(count: number, width: number, m: TileMetrics): number {
  if (count <= 0) return m.tile + 2 * m.pad + BORDER;
  const inner = width - BORDER - m.badgeWidth - 2 * m.pad - 1;
  return blockHeight(linesFor(count, inner, m), m) + BORDER;
}

function poolBodies(input: FitInput, m: TileMetrics): { min: number; content: number } {
  if (input.poolCount <= 0) return { min: EMPTY_POOL_BODY, content: EMPTY_POOL_BODY };
  const inner = input.width - BORDER - 2 * m.pad - POOL_SCROLLBAR;
  const content = blockHeight(linesFor(input.poolCount, inner, m), m);
  // Always room for one full line plus a peek of the next, so the pool never looks empty.
  return { min: Math.min(content, Math.round(m.cellHeight * 1.5) + 2 * m.pad), content };
}

function needed(input: FitInput, m: TileMetrics): number {
  const rows =
    input.tierCounts.reduce((sum, n) => sum + rowHeight(n, input.width, m), 0) +
    Math.max(0, input.tierCounts.length - 1) * m.rowGap;
  const pool = input.poolHeadHeight + BORDER + (input.poolCollapsed ? 0 : poolBodies(input, m).min);
  return rows + SECTION_GAP + pool;
}

function largestTile(input: FitInput, showNames: boolean): { tile: number; overflow: boolean } {
  for (let t = maxTileFor(input.width, input.height); t >= MIN_TILE; t--) {
    if (needed(input, metricsFor(t, input.shape, showNames)) <= input.height) return { tile: t, overflow: false };
  }
  return { tile: MIN_TILE, overflow: true };
}

export function computeFit(input: FitInput): FitResult {
  let showNames = input.showNames;
  let { tile, overflow } = largestTile(input, showNames);
  if (showNames && tile < NAMES_MIN_TILE) {
    const bare = largestTile(input, false);
    // Also when neither fits: labels are the first thing to give, they only make the cramped rows taller.
    if (bare.tile > tile || overflow) {
      showNames = false;
      ({ tile, overflow } = bare);
    }
  }
  const m = metricsFor(tile, input.shape, showNames);
  const pool = poolBodies(input, m);
  const chrome = input.poolHeadHeight + BORDER;
  const maxBody = Math.max(pool.min, Math.floor(input.height * POOL_SHARE) - chrome);
  return {
    tile: m.tile,
    tileWidth: m.tileWidth,
    gap: m.gap,
    pad: m.pad,
    rowGap: m.rowGap,
    nameFont: m.nameFont,
    badgeWidth: m.badgeWidth,
    badgeFont: m.badgeFont,
    rowMin: m.tile + 2 * m.pad,
    poolMinBody: pool.min,
    poolMaxBody: maxBody,
    poolMinTotal: chrome + (input.poolCollapsed ? 0 : pool.min),
    poolMaxTotal: chrome + (input.poolCollapsed ? 0 : maxBody),
    overflow,
    namesHidden: input.showNames && !showNames,
  };
}
