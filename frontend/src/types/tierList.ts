// frontend/src/types/tierList.ts

/** What an official tier list ranks. Mirrors `TIER_LIST_KINDS` in backend/app/models/tier_list.py. */
export type TierListKind =
  | 'survivor_perks'
  | 'killer_perks'
  | 'survivors'
  | 'killers'
  | 'maps'
  | 'custom';

/**
 * A tier color: either one of the named theme tokens (`s`..`f`, `neutral`),
 * which map onto `--color-tier-*` and so follow the active theme, or a
 * user-chosen `#rrggbb` hex.
 */
export type TierColor = string;

export interface TierDefinition {
  id: string;
  label: string;
  color: TierColor;
  /** An https:/data: image shown as the tier's own tag instead of its color + letter. */
  backgroundImage?: string;
}

/** Ordered item keys per tier id. Anything not listed sits in the unranked pool. */
export type TierPlacements = Record<string, string[]>;

// ---------------------------------------------------------------------------
// API shapes (GET /api/v1/tier-lists, GET /api/v1/tier-lists/<slug>)
// ---------------------------------------------------------------------------

export interface TierListSummary {
  id: number;
  slug: string;
  kind: TierListKind;
  title: string;
  description: string;
  cover_image_url: string;
  is_featured: boolean;
  sort_order: number;
  /** Null when the list ranks a whole catalog -- only the live catalog knows how big that is. */
  item_count: number | null;
  tier_count: number | null;
  has_default_placements: boolean;
  updated_at: string | null;
}

export interface TierListApiCustomItem {
  id: string;
  name: string;
  image_url: string;
  image_local_path: string;
}

export interface TierListTemplate extends TierListSummary {
  /** Null means the default S/A/B/C/D/F ladder. */
  tiers: TierDefinition[] | null;
  /** Restricts the pool to these catalog ids; null means the whole catalog. */
  item_ids: number[] | null;
  custom_items: TierListApiCustomItem[] | null;
  default_placements: TierPlacements | null;
}

// ---------------------------------------------------------------------------
// Board model
// ---------------------------------------------------------------------------

/**
 * One thing that can be ranked, normalized from whichever catalog it came from.
 *
 * `key` is stable and language-independent -- `perk:12`, `survivor:7`,
 * `killer:7`, `map:31`, or a custom item's own id -- because names are
 * translated and a ranking saved in Polish must still resolve in English.
 * Survivors and killers carry their role in the key since the two tables
 * number their rows independently (survivor 7 is not killer 7).
 */
export interface TierItem {
  key: string;
  name: string;
  image: string | null;
  /** Larger picture for the preview modal when `image` is a thumbnail. */
  fullImage?: string | null;
  subtitle?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Portable JSON document (import / export / share links)
// ---------------------------------------------------------------------------

export const TIER_LIST_FORMAT = 'lemondbd-tier-list' as const;
export const TIER_LIST_FORMAT_VERSION = 1 as const;

export interface TierListDocumentItem {
  id: string;
  name: string;
  /** https:, data:image/* or a backend /static/ path -- anything else is dropped on import. */
  image?: string;
}

export interface TierListDocument {
  format: typeof TIER_LIST_FORMAT;
  version: typeof TIER_LIST_FORMAT_VERSION;
  title: string;
  description?: string;
  /** Slug of the official list this ranks, or null for a self-contained custom list. */
  template: string | null;
  tiers: TierDefinition[];
  /** Custom lists only: the items being ranked. */
  items?: TierListDocumentItem[];
  placements: TierPlacements;
  /** Custom lists only: an https:/data: image shown behind the list's card and page. */
  backgroundImage?: string;
}

// ---------------------------------------------------------------------------
// localStorage shape
// ---------------------------------------------------------------------------

/** A user's ranking of one official list. `tiers` is null until they customize the ladder. */
export interface StoredRanking {
  tiers: TierDefinition[] | null;
  placements: TierPlacements;
  updatedAt: number;
}

export interface StoredCustomList {
  id: string;
  title: string;
  description: string;
  tiers: TierDefinition[];
  items: TierListDocumentItem[];
  placements: TierPlacements;
  createdAt: number;
  updatedAt: number;
  /** An https:/data: image shown behind this list's card and its own page. Unset means none. */
  backgroundImage?: string;
}

export interface TierListStoreState {
  version: 1;
  rankings: Record<string, StoredRanking>;
  custom: Record<string, StoredCustomList>;
}
