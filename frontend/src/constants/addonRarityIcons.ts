// frontend/src/constants/addonRarityIcons.ts
import type { AddonRarity } from '@/types/chaosStreak';

export const ADDON_RARITY_ICONS: Record<AddonRarity, string> = {
  Common: '/images/addon-rarity/common.webp',
  Uncommon: '/images/addon-rarity/uncommon.webp',
  Rare: '/images/addon-rarity/rare.webp',
  'Very Rare': '/images/addon-rarity/very-rare.webp',
  'Ultra Rare': '/images/addon-rarity/ultra-rare.webp',
};

/** The streaks dictionary key holding each rarity's translated name. */
export const ADDON_RARITY_LABEL_KEYS = {
  Common: 'addonRarityCommon',
  Uncommon: 'addonRarityUncommon',
  Rare: 'addonRarityRare',
  'Very Rare': 'addonRarityVeryRare',
  'Ultra Rare': 'addonRarityUltraRare',
} as const satisfies Record<AddonRarity, string>;

/** Tile backgrounds: the add-on rarities plus the gold Event tile. */
export const RARITY_TILE_IMAGES: Record<AddonRarity | 'Event', string> = {
  ...ADDON_RARITY_ICONS,
  Event: '/images/addon-rarity/event.webp',
};
