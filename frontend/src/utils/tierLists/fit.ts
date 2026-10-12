// frontend/src/utils/tierLists/fit.ts
//
// Sizes the tier board tiles to a comfortable, constant size for the current
// viewport width (scaled by the user's chosen percentage), or automatically
// fits all tiers onto a single screen when `scale === 'fit'` (e.g. for screenshots).

export type FitShape = 'square' | 'wide';

export const BOARD_SCALE_STEPS = [40, 55, 70, 85, 100, 115, 130] as const;
export type BoardScaleStep = (typeof BOARD_SCALE_STEPS)[number];
export type BoardScale = BoardScaleStep | 'fit';

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
  /** User-selected scale percentage (40..130) or 'fit' to fit all tiers on screen. Defaults to 100. */
  scale?: BoardScale;
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
  /** Floor and ceiling of the pool's body. */
  poolMinBody: number;
  poolMaxBody: number;
  /** The same bounds for the whole pool panel (header and borders included). */
  poolMinTotal: number;
  poolMaxTotal: number;
  /** True when the board is taller than the viewport and the page scrolls. */
  pageScroll: boolean;
  /** True when in 'fit' mode and the pool scrolls internally to keep the board within the screen. */
  fitMode: boolean;
  /** Kept for compatibility. */
  overflow: boolean;
  /** True when item names were switched off on very small tiles. */
  namesHidden: boolean;
}

export const MIN_TILE = 18;
export const BASE_MIN_TILE = 48;
export const NAMES_MIN_TILE = 44;
const BASE_MAX_TILE = 96;
const SCALED_MAX_TILE = 128;
/** Wide (map) tiles are this much wider than tall. */
const WIDE_RATIO = 1.5;
/** Space between the rows block and the pool (the board's `gap-3`). */
const SECTION_GAP = 12;
/** Border of a tier row / the pool (1px on each side). */
const BORDER = 2;
const EMPTY_POOL_BODY = 44;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Constant, comfortable 100%-scale tile size for a given board width:
 * - ~52px on phones (360-420px)
 * - ~60-66px on tablets (768-1024px)
 * - ~70-72px on 720p / laptops (1280-1366px)
 * - ~79-84px on 1080p desktops (1920px)
 * - ~93-96px on 1440p / 2K+ desktops (2560px)
 */
export function maxTileFor(width: number, _height?: number): number {
  return clamp(Math.round(44 + width * 0.022), BASE_MIN_TILE, BASE_MAX_TILE);
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
  // FitText renders item names on a single line of `leading-tight` (1.25), under a 4px gap.
  const nameBlock = showNames ? 4 + Math.ceil(1.25 * nameFont) : 0;
  return {
    tile,
    tileWidth: shape === 'wide' ? Math.round(tile * WIDE_RATIO) : tile,
    cellHeight: tile + nameBlock,
    gap: clamp(Math.round(tile * 0.08), 2, 8),
    pad: clamp(Math.round(tile * 0.1), 3, 12),
    rowGap: clamp(Math.round(tile * 0.08), 2, 8),
    nameFont,
    badgeWidth: clamp(Math.round(tile * 1.1), 40, 128),
    badgeFont: clamp(Math.round(tile * 0.4), 14, 44),
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
  if (count <= 0) return blockHeight(1, m) + BORDER;
  const inner = width - BORDER - m.badgeWidth - 2 * m.pad - 1;
  return blockHeight(linesFor(count, inner, m), m) + BORDER;
}

function rowsTotalHeight(input: FitInput, m: TileMetrics): number {
  return (
    input.tierCounts.reduce((sum, n) => sum + rowHeight(n, input.width, m), 0) +
    Math.max(0, input.tierCounts.length - 1) * m.rowGap
  );
}

function poolContentHeight(input: FitInput, m: TileMetrics): number {
  if (input.poolCount <= 0) return EMPTY_POOL_BODY;
  const inner = input.width - BORDER - 2 * m.pad;
  return blockHeight(linesFor(input.poolCount, inner, m), m);
}

function neededFull(input: FitInput, m: TileMetrics): number {
  const rows = rowsTotalHeight(input, m);
  const pool = input.poolHeadHeight + BORDER + (input.poolCollapsed ? 0 : poolContentHeight(input, m));
  return rows + SECTION_GAP + pool;
}

function fitToScreen(input: FitInput): FitResult {
  const maxTile = maxTileFor(input.width, input.height);
  const chrome = input.poolHeadHeight + BORDER;

  const fitsAt = (t: number, names: boolean) => {
    const m = metricsFor(t, input.shape, names);
    return rowsTotalHeight(input, m) <= input.height;
  };

  let showNames = input.showNames;
  let chosen = MIN_TILE;
  let overflow = true;

  for (let t = maxTile; t >= MIN_TILE; t--) {
    if (fitsAt(t, showNames)) {
      chosen = t;
      overflow = false;
      break;
    }
  }

  if (showNames && chosen < NAMES_MIN_TILE) {
    for (let t = maxTile; t >= MIN_TILE; t--) {
      if (fitsAt(t, false)) {
        if (t > chosen || overflow) {
          showNames = false;
          chosen = t;
          overflow = false;
        }
        break;
      }
    }
  }

  const m = metricsFor(chosen, input.shape, showNames);
  const rows = rowsTotalHeight(input, m);
  const content = poolContentHeight(input, m);
  const remainingBody = Math.max(EMPTY_POOL_BODY, input.height - rows - SECTION_GAP - chrome);
  const maxBody = input.poolCollapsed ? 0 : Math.min(content, remainingBody);
  const minBody = input.poolCollapsed ? 0 : Math.min(content, maxBody);

  return {
    tile: m.tile,
    tileWidth: m.tileWidth,
    gap: m.gap,
    pad: m.pad,
    rowGap: m.rowGap,
    nameFont: m.nameFont,
    badgeWidth: m.badgeWidth,
    badgeFont: m.badgeFont,
    rowMin: m.cellHeight + 2 * m.pad,
    poolMinBody: minBody,
    poolMaxBody: maxBody,
    poolMinTotal: chrome + minBody,
    poolMaxTotal: chrome + maxBody,
    pageScroll: false,
    fitMode: true,
    overflow,
    namesHidden: input.showNames && !showNames,
  };
}

export function computeFit(input: FitInput): FitResult {
  const scale = input.scale ?? 100;
  if (scale === 'fit') {
    return fitToScreen(input);
  }

  const baseTile = maxTileFor(input.width, input.height);
  const tile = clamp(Math.round((baseTile * scale) / 100), MIN_TILE, SCALED_MAX_TILE);
  const showNames = input.showNames && tile >= NAMES_MIN_TILE;
  const m = metricsFor(tile, input.shape, showNames);
  const content = poolContentHeight(input, m);
  const chrome = input.poolHeadHeight + BORDER;
  const totalPool = chrome + (input.poolCollapsed ? 0 : content);
  return {
    tile: m.tile,
    tileWidth: m.tileWidth,
    gap: m.gap,
    pad: m.pad,
    rowGap: m.rowGap,
    nameFont: m.nameFont,
    badgeWidth: m.badgeWidth,
    badgeFont: m.badgeFont,
    rowMin: m.cellHeight + 2 * m.pad,
    poolMinBody: content,
    poolMaxBody: content,
    poolMinTotal: totalPool,
    poolMaxTotal: totalPool,
    pageScroll: neededFull(input, m) > input.height,
    fitMode: false,
    overflow: false,
    namesHidden: input.showNames && !showNames,
  };
}
