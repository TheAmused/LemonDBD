// frontend/src/types/map.ts
export type PalletSafetyRating = 'god' | 'safe' | 'mindgameable' | 'unsafe';

export interface Realm {
  name: string;
  image_url: string;
  image_local_path: string;
}

export interface MapTile {
  id?: number | string;
  name: string;
  type: string;
  x: number;
  y: number;
  has_pallet: boolean;
  pallet_safety_rating?: PalletSafetyRating | null;
  has_window: boolean;
  vault_direction?: string;
  vault_directions?: string[] | string;
  looping_tips?: string;
  mindgame_counter?: string;
  seed_variant?: string;
  floor?: number;
  callout_label?: string;
}

export interface MapObjective {
  id?: number | string;
  type: 'totem' | 'generator' | 'exit_gate' | 'hatch' | 'chest' | 'basement' | 'pallet' | 'window' | string;
  x: number;
  y: number;
  location_description: string;
  seed_variant?: string;
  floor?: number;
  pallet_safety_rating?: PalletSafetyRating | null;
  vault_direction?: string;
  looping_tips?: string;
  mindgame_counter?: string;
  callout_label?: string;
}

export interface MapRealm {
  /** The integer primary key. It was a string --
   *  `hens_autohaven_wreckers_azarovs_resting_place` -- which spelled out the
   *  callout provider, the realm and the name, all three of which the row
   *  already carries as `source`, `realm` and `name`. */
  id: number;
  name: string;
  realm: string;
  layout_type: string;
  jungle_gyms_count: number;
  totem_spawns_count: number;
  pallet_density: string;
  shack_has_basement: boolean;
  description: string;
  image_url?: string;
  source?: string;
  source_label?: string;
  callout_image_url?: string;
  callout_image_local_path?: string;
  tiles?: MapTile[];
  objectives?: MapObjective[];
}
