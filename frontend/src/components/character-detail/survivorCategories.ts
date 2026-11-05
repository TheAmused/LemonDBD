// frontend/src/components/character-detail/survivorCategories.ts
//
// Which item type a survivor item or add-on belongs to (med-kit, toolbox, ...), and that type's icon. The
// equipment section filters by it; the add-on popup reads the same category to pick the item's icon.
import type { AddonItem, EquipmentItem } from './types';

export type SurvivorCategoryKey =
  | 'medkit'
  | 'toolbox'
  | 'flashlight'
  | 'key'
  | 'map'
  | 'fog_vial'
  | 'event'
  | 'trial_exclusive';

const SURVIVOR_CATEGORY_KEYS: readonly SurvivorCategoryKey[] = [
  'medkit',
  'toolbox',
  'flashlight',
  'key',
  'map',
  'fog_vial',
  'event',
  'trial_exclusive',
];
export const isSurvivorCategoryKey = (value: string): value is SurvivorCategoryKey =>
  (SURVIVOR_CATEGORY_KEYS as readonly string[]).includes(value);

export function getSurvivorItemCategory(it: EquipmentItem): SurvivorCategoryKey {
  const cat = (it.category || '').toLowerCase();
  const rarity = (it.rarity || '').toLowerCase();
  const name = (it.raw_name || it.name || '').toLowerCase();

  if (cat === 'event' || rarity === 'event') return 'event';
  if (cat === 'fog vial' || cat === 'fog_vial' || cat.includes('fog') || cat.includes('vial')) return 'fog_vial';
  if (cat === 'trial artifact' || cat === 'trial_exclusive' || cat === 'special' || cat.includes('trial') || cat.includes('artifact')) return 'trial_exclusive';
  if (cat === 'med-kit' || cat === 'medkit' || cat.includes('med') || cat.includes('aid')) return 'medkit';
  if (cat === 'toolbox' || cat.includes('tool')) return 'toolbox';
  if (cat === 'flashlight' || cat.includes('flash') || cat.includes('torch')) return 'flashlight';
  if (cat === 'key') return 'key';
  if (cat === 'map') return 'map';
  if (cat === 'firecracker' || cat.includes('firecracker') || cat.includes('party')) return 'event';

  if (rarity === 'event' || ['anniversary', 'banquet', 'masquerade', 'lunchbox', 'will o', 'firecracker', 'party'].some((k) => name.includes(k))) return 'event';
  if (['medkit', 'aid'].some((k) => name.includes(k))) return 'medkit';
  if (['toolbox', 'tool'].some((k) => name.includes(k))) return 'toolbox';
  if (['flashlight', 'torch'].some((k) => name.includes(k))) return 'flashlight';
  if (name.includes('key')) return 'key';
  if (name.includes('map')) return 'map';

  return 'trial_exclusive';
}

export function getSurvivorAddonCategory(it: AddonItem): SurvivorCategoryKey {
  const target = (it.associated_target || '').toLowerCase();
  const cat = (it.category || '').toLowerCase();
  const rarity = (it.rarity || '').toLowerCase();
  const name = (it.raw_name || it.name || '').toLowerCase();

  if (rarity === 'event' || target === 'event' || cat === 'event') return 'event';
  if (target === 'fog vials' || target.includes('fog') || target.includes('vial')) return 'fog_vial';
  if (target === 'med-kits' || target.includes('med') || target.includes('aid')) return 'medkit';
  if (target === 'toolboxes' || target.includes('tool')) return 'toolbox';
  if (target === 'flashlights' || target.includes('flash') || target.includes('torch')) return 'flashlight';
  if (target === 'keys' || target.includes('key')) return 'key';
  if (target === 'maps' || target.includes('map')) return 'map';

  if (rarity === 'event' || name.includes('serum') || name.includes('broken bulb')) return 'event';

  return 'trial_exclusive';
}

/** The plain item picture (a white glyph on transparent) for each category: the add-on popup shows it, tinted, for "fits this item". */
export const SURVIVOR_CATEGORY_GLYPH: Partial<Record<SurvivorCategoryKey, string>> = {
  medkit: 'icons/items/first_aid_kit.webp',
  toolbox: 'icons/items/toolbox.webp',
  flashlight: 'icons/items/flashlight.webp',
  key: 'icons/items/skeleton_key.webp',
  map: 'icons/items/annotated_map.webp',
  fog_vial: 'icons/items/apprentices_fog_vial.webp',
  event: 'icons/items/third_year_party_starter.webp',
};
