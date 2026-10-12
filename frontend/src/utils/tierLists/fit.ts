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
  /** True when the pool is shown in full at a comfortable tile size and the whole board scrolls instead of the pool. */
  pageScroll: boolean;
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
/** Smallest tile at which showing the entire pool at once is still worth it. */
const FULL_POOL_MIN_TILE = 64;
/** Tile size aimed at when the board is allowed to scroll. */
const SCROLL_TILE = 84;
const SCROLL_MIN_WIDTH = 900;

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

function needed(input: FitInput, m: TileMetrics, fullPool: boolean): number {
  const rows =
    input.tierCounts.reduce((sum, n) => sum + rowHeight(n, input.width, m), 0) +
    Math.max(0, input.tierCounts.length - 1) * m.rowGap;
  const pool = input.poolHeadHeight + BORDER + (input.poolCollapsed ? 0 : fullPool ? poolBodies(input, m).content : poolBodies(input, m).min);
  return rows + SECTION_GAP + pool;
}

function largestTile(input: FitInput, showNames: boolean, fullPool: boolean): { tile: number; overflow: boolean } {
  for (let t = maxTileFor(input.width, input.height); t >= MIN_TILE; t--) {
    if (needed(input, metricsFor(t, input.shape, showNames), fullPool) <= input.height) return { tile: t, overflow: false };
  }
  return { tile: MIN_TILE, overflow: true };
}

/**
 * Prefers a board that shows everything on one screen, but only while the tiles stay big (FULL_POOL_MIN_TILE).
 * Otherwise the tiles are sized for comfort (up to SCROLL_TILE) and the whole board scrolls.
 */
export function computeFit(input: FitInput): FitResult {
  const full = fitWith(input, true);
  if (!full.overflow && !full.namesHidden && full.tile >= FULL_POOL_MIN_TILE) return full;
  // Phones and small tablets keep shrinking tiles to fit: a scrolling board is awkward under a thumb.
  if (input.width < SCROLL_MIN_WIDTH) return fitWith(input, false);
  const tile = Math.min(maxTileFor(input.width, input.height), SCROLL_TILE);
  if (tile <= full.tile && !full.overflow) return full;
  return fitWith(input, true, tile);
}

function fitWith(input: FitInput, fullPool: boolean, forcedTile?: number): FitResult {
  let showNames = input.showNames;
  let { tile, overflow } = forcedTile ? { tile: forcedTile, overflow: false } : largestTile(input, showNames, fullPool);
  if (!forcedTile && showNames && tile < NAMES_MIN_TILE) {
    const bare = largestTile(input, false, fullPool);
    // Also when neither fits: labels are the first thing to give, they only make the cramped rows taller.
    if (bare.tile > tile || overflow) {
      showNames = false;
      ({ tile, overflow } = bare);
    }
  }
  const m = metricsFor(tile, input.shape, showNames);
  const pool = poolBodies(input, m);
  const chrome = input.poolHeadHeight + BORDER;
  const maxBody = fullPool ? pool.content : Math.max(pool.min, Math.floor(input.height * POOL_SHARE) - chrome);
  return {
    tile: m.tile,
    tileWidth: m.tileWidth,
    gap: m.gap,
    pad: m.pad,
    rowGap: m.rowGap,
    nameFont: m.nameFont,
    // On the scrolling board the tier strip is slimmer, so the rows do not dwarf the pool below them.
    badgeWidth: forcedTile ? Math.round(m.badgeWidth * 0.75) : m.badgeWidth,
    badgeFont: forcedTile ? Math.round(m.badgeFont * 0.7) : m.badgeFont,
    rowMin: forcedTile ? Math.round(m.tile * 0.7) + 2 * m.pad : m.tile + 2 * m.pad,
    poolMinBody: fullPool ? pool.content : pool.min,
    poolMaxBody: maxBody,
    poolMinTotal: chrome + (input.poolCollapsed ? 0 : fullPool ? pool.content : pool.min),
    poolMaxTotal: chrome + (input.poolCollapsed ? 0 : maxBody),
    pageScroll: forcedTile !== undefined && needed(input, m, fullPool) > input.height,
    overflow,
    namesHidden: input.showNames && !showNames,
  };
}
