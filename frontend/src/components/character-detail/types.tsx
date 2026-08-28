// frontend/src/components/character-detail/types.tsx
import React from 'react';

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
  wiki_slug?: string;
  short_name?: string;
  chapter_name?: string;
  chapter_number?: string;
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
  dict?: Record<string, unknown>;
  detailData: CharacterDetailPayload;
  allCharacters?: CharacterItem[];
}

export interface RarityTileStyle {
  bg: string;
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
      const locMap: Record<string, string> = {
        en: 'en-US',
        pl: 'pl-PL',
        de: 'de-DE',
        es: 'es-ES',
        ja: 'ja-JP',
      };
      return parsed.toLocaleDateString(locMap[locale] || locale, {
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
    const cleanPath = path.replace(/^\/?(static\/)?/, '');
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
    rawPath = `avatars/${subDir}/${sanitized}.png`;
  }
  if (rawPath) {
    const cleanPath = rawPath.replace(/^\/?(static\/)?/, '');
    return `${backendBase}/static/${cleanPath}`;
  }
  return char.avatar_url || char.portrait_url || '';
}

export function getRarityTileStyle(rarity?: string): RarityTileStyle {
  const r = (rarity || '').toLowerCase();
  if (r.includes('ultra') || r.includes('iridescent')) {
    return {
      bg: 'bg-gradient-to-br from-[#c9245e] via-[#85123d] to-[#45051e] border-[#f24483] shadow-[0_0_16px_rgba(242,68,131,0.5)]',
      badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
      text: 'text-pink-400',
    };
  }
  if (r.includes('very rare') || r.includes('purple')) {
    return {
      bg: 'bg-gradient-to-br from-[#7e2ba3] via-[#52176e] to-[#2b083b] border-[#ad43e3] shadow-[0_0_14px_rgba(173,67,227,0.45)]',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      text: 'text-purple-400',
    };
  }
  if (r.includes('rare') || r.includes('blue')) {
    return {
      bg: 'bg-gradient-to-br from-[#1f6fb2] via-[#154d7a] to-[#0a2740] border-[#3b9fe0] shadow-[0_0_12px_rgba(59,159,224,0.4)]',
      badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      text: 'text-sky-400',
    };
  }
  if (r.includes('uncommon') || r.includes('green')) {
    return {
      bg: 'bg-gradient-to-br from-[#277a3c] via-[#1a5328] to-[#0c2a13] border-[#38b259] shadow-[0_0_12px_rgba(56,178,89,0.4)]',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      text: 'text-emerald-400',
    };
  }
  if (r.includes('common') || r.includes('brown')) {
    return {
      bg: 'bg-gradient-to-br from-[#5c4033] via-[#432d24] to-[#251710] border-[#8b5a3e] shadow-[0_0_12px_rgba(139,90,62,0.35)]',
      badge: 'bg-amber-800/30 text-amber-200 border-amber-700/40',
      text: 'text-amber-300',
    };
  }
  if (r.includes('event')) {
    return {
      bg: 'bg-gradient-to-br from-[#d97706] via-[#92400e] to-[#451a03] border-[#f59e0b] shadow-[0_0_14px_rgba(245,158,11,0.45)]',
      badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      text: 'text-orange-400',
    };
  }
  return {
    bg: 'bg-slate-900 border-slate-700 shadow-md',
    badge: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
    text: 'text-slate-400',
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

export {
  DBD_KEYWORDS,
  ACTION_KEYWORDS,
  TOKEN_REGEX,
  createDbdTokenRegex,
  parseLineTokens,
  renderFormattedDbdText,
} from '@/utils/textFormatter';


