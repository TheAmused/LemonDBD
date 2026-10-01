// frontend/src/utils/tierLists/constants.ts
import type { TierDefinition } from '@/types/tierList';

/** Droppable id of the unranked pool. Tier ids are user-editable, so this is namespaced. */
export const POOL_CONTAINER_ID = '__pool__';

/** The ladder a list gets when neither the template nor the user defined one. */
export const DEFAULT_TIERS: readonly TierDefinition[] = Object.freeze([
  { id: 's', label: 'S', color: 's' },
  { id: 'a', label: 'A', color: 'a' },
  { id: 'b', label: 'B', color: 'b' },
  { id: 'c', label: 'C', color: 'c' },
  { id: 'd', label: 'D', color: 'd' },
  { id: 'f', label: 'F', color: 'f' },
]);

/** Named tier colors. Each maps onto a `--color-tier-*` token in app/globals.css. */
export const TIER_COLOR_TOKENS = ['s', 'a', 'b', 'c', 'd', 'e', 'f', 'neutral'] as const;
export type TierColorToken = (typeof TIER_COLOR_TOKENS)[number];

/**
 * Literal class strings, so Tailwind's source scan generates them. A class
 * assembled at runtime (`bg-tier-${token}`) would never be emitted.
 */
export const TIER_TOKEN_BG_CLASSES: Record<TierColorToken, string> = {
  s: 'bg-tier-s',
  a: 'bg-tier-a',
  b: 'bg-tier-b',
  c: 'bg-tier-c',
  d: 'bg-tier-d',
  e: 'bg-tier-e',
  f: 'bg-tier-f',
  neutral: 'bg-tier-neutral',
};

/**
 * Hard caps on anything that arrives from a pasted JSON payload or a share
 * link. Generous for real use, small enough that a hostile payload cannot
 * freeze the page or fill localStorage.
 */
export const TIER_LIST_LIMITS = {
  maxPayloadChars: 1_500_000,
  maxTiers: 20,
  maxItems: 400,
  maxTitle: 120,
  maxDescription: 500,
  maxTierLabel: 32,
  maxItemName: 80,
  maxItemId: 64,
  /** Per inline `data:` image, in characters of base64. ~96 KB of image. */
  maxDataImageChars: 131_072,
  /** Past this a share link still works, but chat apps may truncate it. */
  shareLinkWarnChars: 8_000,
} as const;


export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const ITEM_ID_PATTERN = /^[A-Za-z0-9_:.-]+$/;


/** The map source the explorer loads, so both pages share one cached request. */
export const TIER_LIST_MAP_SOURCE = 'hens333';

// Shared with the other portable-JSON codec; re-exported so callers keep one import site.
export { DATA_IMAGE_PATTERN, SHARE_HASH_PARAM } from '@/utils/shareCodec';
