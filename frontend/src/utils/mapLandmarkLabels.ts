// frontend/src/utils/mapLandmarkLabels.ts
import type { Dictionary } from '@/locales/types';

export const KNOWN_FEATURE_CODES = [
  'C|H',
  'H/FB',
  'WT',
  'CT',
  'GARDEN',
  'STATUE',
  'H',
  'T',
  'P',
  'UFO',
] as const;

export type FeatureCode = (typeof KNOWN_FEATURE_CODES)[number];

/**
 * Maps DBD competitive feature landmark codes to localized names.
 * Falls back to the raw code if unknown or translation missing.
 */
export function getFeatureLandmarkName(
  code: string,
  dict?: Partial<Dictionary> | null,
): string {
  if (!dict || !('maps' in dict) || !dict.maps) return code;
  const maps = dict.maps;

  switch (code) {
    case 'C|H':
      return maps.landmarkCowTreeHarvester || code;
    case 'H/FB':
      return maps.landmarkHouseFallBuilding || code;
    case 'WT':
      return maps.landmarkWaterTower || code;
    case 'CT':
      return maps.landmarkCourtyard || code;
    case 'GARDEN':
      return maps.landmarkGarden || code;
    case 'STATUE':
      return maps.landmarkStatue || code;
    case 'H':
      return maps.landmarkHill || code;
    case 'T':
      return maps.landmarkTower || code;
    case 'P':
      return maps.landmarkPagoda || code;
    case 'UFO':
      return maps.landmarkShuttle || code;
    default:
      return code;
  }
}

// Referenced translation keys planned for map legend overlay
type _ReferencedMapKeys =
  | 'legendTitle'
  | 'legendToggleAria'
  | 'legendClockTitle'
  | 'legendClockDesc'
  | 'legendFeatures';
