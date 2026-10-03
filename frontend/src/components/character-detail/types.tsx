// frontend/src/components/character-detail/types.tsx
import React from 'react';
import { RARITY_TILE_IMAGES } from '@/constants/addonRarityIcons';
import { localeMetaFor } from '@/i18n/config';

export interface CharacterItem {
  id?: number;
  name: string;
  category: string;
  role?: string;
  real_name?: string;
  code_prefix?: string;
  avatar_url?: string;
  avatar_local_path?: string;
  portrait_url?: string;
  release_number?: number;
  /** `id` above is the stable, translation-proof key. `wiki_slug` and
   * `short_name` were `name` respelled and are no longer returned. */
  chapter_id?: number;
  chapter_name?: string;
  dlc_type?: string;
  is_licensed?: boolean;
  release_year?: number;
  release_date?: string;
  dlc_counterparts?: string[];
  lore?: string;
  is_disabled?: boolean;
  disabled_reason?: string | null;
}

export interface PerkItem {
  id?: number;
  name: string;
  raw_name?: string;
  category: string;
  character: string;
  character_real_name?: string;
  character_avatar_path?: string;
  character_id?: number | null;
  description: string;
  icon_url?: string;
  icon_local_path?: string;
  is_teachable?: boolean;
  is_disabled?: boolean;
  disabled_reason?: string | null;
}

export interface AddonItem {
  id?: number;
  name: string;
  raw_name?: string;
  associated_target?: string;
  category?: string;
  description?: string;
  icon_url?: string;
  icon_local_path?: string;
  rarity?: string;
}

export interface EquipmentItem {
  id?: number;
  name: string;
  raw_name?: string;
  category: string;
  role?: string;
  description?: string;
  icon_url?: string;
  icon_local_path?: string;
  rarity?: string;
  associated_target?: string;
}

export interface KillerPowerInfo {
  name: string;
  raw_name?: string;
  description: string;
  icon_url?: string;
  icon_local_path?: string;
  movement_speed?: string;
  terror_radius?: string;
  terror_radius_meters?: number;
  height?: string;
}

export interface OfferingItem {
  id?: number;
  name: string;
  raw_name?: string;
  category: string;
  role?: string;
  description?: string;
  icon_url?: string;
  icon_local_path?: string;
  rarity?: string;
}

export interface CharacterDetailPayload {
  character: CharacterItem;
  power?: KillerPowerInfo | null;
  perks: PerkItem[];
  addons: (AddonItem | EquipmentItem)[];
  items?: EquipmentItem[];
  offerings?: OfferingItem[];
}

export type CharacterDetailDictionary = Record<string, string>;

export interface CharacterViewBaseProps {
  currentLocale: string;
  detailData: CharacterDetailPayload;
  allCharacters?: CharacterItem[];
}

export interface RarityTileStyle {
  /** Tile classes. Image-backed rarities only carry a transparent border here. */
  bg: string;
  /** Inline background (the rarity artwork) for rarities that have an image. */
  style?: React.CSSProperties;
  badge: string;
  text: string;
}

export function getRarityRank(rarity?: string): number {
  const r = (rarity || '').toLowerCase();
  if (r.includes('common') && !r.includes('uncommon')) return 1;
  if (r.includes('uncommon')) return 2;
  if (r.includes('rare') && !r.includes('very') && !r.includes('ultra')) return 3;
  if (r.includes('very rare') || r.includes('purple')) return 4;
  if (r.includes('ultra') || r.includes('iridescent') || r.includes('pink')) return 5;
  if (r.includes('event')) return 6;
  return 99;
}

export function formatLocalizedReleaseDate(rawDate?: string, locale: string = 'en'): string {
  if (!rawDate) return '2016';
  const trimmed = rawDate.trim();
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    try {
      return parsed.toLocaleDateString(localeMetaFor(locale).bcp47, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return rawDate;
    }
  }
  return rawDate;
}

export function formatKillerHeight(height?: string, t?: Record<string, string>): string {
  const h = (height || '').toLowerCase().trim();
  if (h === 'tall') return t?.heightTall || 'Tall';
  if (h === 'average') return t?.heightAverage || 'Average';
  if (h === 'short') return t?.heightShort || 'Short';
  return height || t?.heightAverage || 'Average';
}

export function localizeMetresUnit(count: number, locale: string): string {
  switch (locale) {
    case 'pl': {
      if (count === 1) return 'metr';
      const lastDigit = count % 10;
      const lastTwo = count % 100;
      if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 'metry';
      return 'metrów';
    }
    case 'de':
      return 'Meter';
    case 'es':
      return count === 1 ? 'metro' : 'metros';
    case 'ja':
      return 'メートル';
    default:
      return count === 1 ? 'metre' : 'metres';
  }
}

export function localizeTerrorRadiusText(raw: string, locale: string): string {
  return raw.replace(/(\d+)\s*metres?\b/gi, (_match, num: string) => `${num} ${localizeMetresUnit(Number(num), locale)}`);
}

export function getCharacterSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\-/]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getAssetUrl(backendBase: string, path?: string, url?: string): string {
  if (path) {
    let cleanPath = path.replace(/^\/?(static\/)?/, '');
    cleanPath = cleanPath.replace(/%+/g, '');
    return `${backendBase}/static/${cleanPath}`;
  }
  return url || '';
}

export function getAvatarUrl(
  backendBase: string,
  char: CharacterItem,
  isSurvivor: boolean
): string {
  let rawPath = char.avatar_local_path;
  if (!rawPath && char.name) {
    const subDir = isSurvivor ? 'survivors' : 'killers';
    const sanitized = getCharacterSlug(char.name);
    // Scraped/backend-normalized avatars are always written as WebP
    // (see backend/app/services/image_conversion.py); .png is only a
    // legacy fallback handled by the onError cascades in the UI.
    rawPath = `avatars/${subDir}/${sanitized}.webp`;
  }
  if (rawPath) {
    const cleanPath = rawPath.replace(/^\/?(static\/)?/, '');
    return `${backendBase}/static/${cleanPath}`;
  }
  return char.avatar_url || char.portrait_url || '';
}

/**
 * Small WebP copy of a character avatar for grids/lists (served by
 * `/api/v1/avatars/thumb/...`). Detail pages keep using `getAvatarUrl` (full image).
 * Falls back to the full avatar when the character has no local file.
 */
export function getAvatarThumbUrl(
  backendBase: string,
  char: CharacterItem,
  isSurvivor: boolean
): string {
  const full = getAvatarUrl(backendBase, char, isSurvivor);
  if (!full.startsWith(`${backendBase}/static/avatars/`)) return full;
  const rel = full.slice(`${backendBase}/static/avatars/`.length);
  if (!/\.(webp|png|jpe?g)$/i.test(rel)) return full;
  return `${backendBase}/api/v1/avatars/thumb/${rel}`;
}

function rarityImageTile(rarity: keyof typeof RARITY_TILE_IMAGES): Pick<RarityTileStyle, 'bg' | 'style'> {
  return {
    bg: 'border-transparent bg-no-repeat bg-center bg-[length:100%_100%]',
    style: { backgroundImage: `url(${RARITY_TILE_IMAGES[rarity]})` },
  };
}

export function getRarityTileStyle(rarity?: string): RarityTileStyle {
  const r = (rarity || '').toLowerCase();
  if (r.includes('ultra') || r.includes('iridescent')) {
    return {
      ...rarityImageTile('Ultra Rare'),
      badge: 'bg-accent-pink/20 text-accent-pink border-accent-pink/40',
      text: 'text-accent-pink',
    };
  }
  if (r.includes('very rare') || r.includes('purple')) {
    return {
      ...rarityImageTile('Very Rare'),
      badge: 'bg-accent-purple/20 text-accent-purple border-accent-purple/40',
      text: 'text-accent-purple',
    };
  }
  if (r.includes('rare') || r.includes('blue')) {
    return {
      ...rarityImageTile('Rare'),
      badge: 'bg-accent-blue/20 text-accent-blue border-accent-blue/40',
      text: 'text-accent-blue',
    };
  }
  if (r.includes('uncommon') || r.includes('green')) {
    return {
      ...rarityImageTile('Uncommon'),
      badge: 'bg-accent-green/20 text-accent-green border-accent-green/40',
      text: 'text-accent-green',
    };
  }
  if (r.includes('common') || r.includes('brown')) {
    return {
      ...rarityImageTile('Common'),
      badge: 'bg-accent-amber-deep/30 text-accent-amber border-accent-amber/40',
      text: 'text-accent-amber',
    };
  }
  if (r.includes('event')) {
    return {
      ...rarityImageTile('Event'),
      badge: 'bg-accent-orange/20 text-accent-orange border-accent-orange/40',
      text: 'text-accent-orange',
    };
  }
  // Unknown / unrated rarities (e.g. "Special") look like Common.
  return {
    ...rarityImageTile('Common'),
    badge: 'bg-accent-amber-deep/30 text-accent-amber border-accent-amber/40',
    text: 'text-accent-amber',
  };
}

export function getLocalizedRarity(rarity?: string, t?: Record<string, string>): string {
  if (!rarity) return '';
  const r = rarity.toLowerCase().trim();
  if (r === 'common') return t?.rarityCommon || 'Common';
  if (r === 'uncommon') return t?.rarityUncommon || 'Uncommon';
  if (r === 'rare') return t?.rarityRare || 'Rare';
  if (r === 'very rare' || r === 'veryrare') return t?.rarityVeryRare || 'Very Rare';
  if (r === 'ultra rare' || r === 'ultrarare' || r === 'iridescent') return t?.rarityUltraRare || 'Ultra Rare';
  if (r === 'event') return t?.rarityEvent || 'Event';
  if (r === 'special') return t?.raritySpecial || 'Special';
  return rarity;
}

const ITEM_CATEGORY_KEY_MAP: Record<string, string> = {
  'med-kit': 'categoryMedkit',
  'toolbox': 'categoryToolbox',
  'flashlight': 'categoryFlashlight',
  'key': 'categoryKey',
  'map': 'categoryMapItem',
  'fog vial': 'categoryFogVial',
  'event': 'categoryEventItems',
  'firecracker': 'categoryFirecracker',
  'trial artifact': 'categoryTrialArtifacts',
};

export function getLocalizedItemCategory(category?: string, t?: Record<string, string>): string | undefined {
  if (!category) return undefined;
  const key = ITEM_CATEGORY_KEY_MAP[category.toLowerCase().trim()];
  return (key && t?.[key]) || category;
}



