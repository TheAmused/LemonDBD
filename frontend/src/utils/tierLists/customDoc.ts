// frontend/src/utils/tierLists/customDoc.ts
import {
  TIER_LIST_FORMAT,
  TIER_LIST_FORMAT_VERSION,
  type StoredCustomList,
  type TierDefinition,
  type TierListDocument,
  type TierPlacements,
} from '@/types/tierList';

type CustomListFields = Pick<StoredCustomList, 'title' | 'description' | 'items' | 'backgroundImage' | 'is_nsfw' | '_manifest'>;

/** The portable document for a custom list as it is exported, shared and reported. */
export function buildCustomTierListDoc(
  list: CustomListFields | undefined,
  tiers: TierDefinition[],
  placements: TierPlacements
): TierListDocument {
  return {
    format: TIER_LIST_FORMAT,
    version: TIER_LIST_FORMAT_VERSION,
    title: list?.title ?? '',
    ...(list?.description ? { description: list.description } : {}),
    template: null,
    tiers,
    items: list?.items ?? [],
    placements,
    ...(list?.backgroundImage ? { backgroundImage: list.backgroundImage } : {}),
    ...(list?.is_nsfw ? { is_nsfw: true } : {}),
    ...(list?._manifest ? { _manifest: list._manifest } : {}),
  };
}
