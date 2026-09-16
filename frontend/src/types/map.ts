// frontend/src/types/map.ts
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

export interface MapRealm {
  id: number;
  name: string;
  realm: string;
  realm_id?: number;
  source_id?: number;
  source?: string;
  source_label?: string;
  layout_type: string;
  jungle_gyms_count: number;
  totem_spawns_count: number;
  pallet_density: string;
  is_shack: boolean;
  is_main_building: boolean;
  size_sq_tiles?: number | null;
  size_sq_meters?: number | null;
  description?: string | null;
  image_url?: string;
  callout_image_url?: string;
  callout_image_local_path?: string;
}
