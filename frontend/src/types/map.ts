// frontend/src/types/map.ts
import type { FeatureCode } from '@/utils/mapLandmarkLabels';

export interface Realm {
  id?: number;
  name: string;
  raw_name?: string;
  image_url: string;
  image_local_path: string;
}

export interface MapSource {
  id: number;
  code: string;
  label: string;
}

/** A point in metres: x grows east, y grows south. */
export type MapPoint = [number, number];

/** A fixed landmark on a floor: the main building, the shack, or another fixed feature with its callout code. */
export interface MapLandmark {
  kind: 'main' | 'shack' | 'feature';
  x: number;
  y: number;
  /** Short callout code of a `feature` (e.g. "WT", "C|H"). */
  label?: FeatureCode | string;
  /** Footprint in metres (centred on x, y). Absent: drawn as a marker. */
  w?: number;
  h?: number;
  /** Footprint rotation in degrees, clockwise. */
  angle?: number;
  /** The footprint size is an estimate, not drawn to scale in any source. */
  est?: boolean;
}

/** One floor of a drawn map: outline rings plus rings that are off-limits (not counted in its size). */
export interface MapLayoutFloor {
  label: 'upper' | 'lower' | null;
  outline: MapPoint[][];
  blocked?: MapPoint[][];
  area_m2: number;
  landmarks?: MapLandmark[];
}

/** A map's footprint in metres on the 8 m (sqT) grid, drawn by MapLayoutView. */
export interface MapLayout {
  v: 1;
  cell_m: number;
  width_m: number;
  height_m: number;
  floors: MapLayoutFloor[];
  /** No measured outline is published for this map: shape and scale are approximate. */
  approx?: boolean;
  /** The landmarks were placed from an older version of the map's layout. */
  landmarks_approx?: boolean;
}

export interface MapRealm {
  id: number;
  name: string;
  /** English name, whatever the page language is (used by analytics). */
  raw_name?: string;
  realm: string;
  /** English realm name, whatever the page language is (used by analytics). */
  raw_realm?: string;
  realm_id?: number;
  source_id?: number;
  source?: string;
  source_label?: string;
  layout_type: string;
  jungle_gyms_count: number;
  pallet_density: string;
  is_shack: boolean;
  is_main_building: boolean;
  size_sq_tiles?: number | null;
  size_sq_meters?: number | null;
  /** Null for maps with no published to-scale outline: the callout image is shown instead. */
  layout?: MapLayout | null;
  description?: string | null;
  image_url?: string;
  callout_image_url?: string;
  callout_image_local_path?: string;
}
