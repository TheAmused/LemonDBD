// frontend/src/constants/addonRarityIcons.ts
import { AddonRarity } from '@/types/chaosStreak';

export const ADDON_RARITY_ICONS: Record<AddonRarity, string> = {
  Common: '/images/addon-rarity/common.webp',
  Uncommon: '/images/addon-rarity/uncommon.webp',
  Rare: '/images/addon-rarity/rare.webp',
  'Very Rare': '/images/addon-rarity/very-rare.webp',
  'Ultra Rare': '/images/addon-rarity/ultra-rare.webp',
};

/** Tile backgrounds: the add-on rarities plus the gold Event tile. */
export const RARITY_TILE_IMAGES: Record<AddonRarity | 'Event', string> = {
  ...ADDON_RARITY_ICONS,
  Event: '/images/addon-rarity/event.webp',
};
