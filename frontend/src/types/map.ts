export type PalletSafetyRating = 'god' | 'safe' | 'mindgameable' | 'unsafe';

export interface TotemSpawn {
  id: number;
  x: number;
  y: number;
  location: string;
  description?: string;
}

export interface KeyTile {
  name: string;
  type: string;
  x: number;
  y: number;
  has_pallet: boolean;
  has_window: boolean;
  pallet_safety_rating?: PalletSafetyRating | null;
  vault_direction?: string;
  vault_directions?: string[] | string;
  looping_tips?: string;
  mindgame_counter?: string;
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
  id: string;
  name: string;
  realm: string;
  layout_type: string;
  jungle_gyms_count: number;
  totem_spawns_count: number;
  pallet_density: string;
  shack_has_basement: boolean;
  description: string;
  image_url?: string;
  totem_spawns?: TotemSpawn[];
  key_tiles?: KeyTile[];
  seed_variant?: string;
  floor?: number;
  pallet_safety_rating?: PalletSafetyRating;
  has_pallet?: boolean;
  has_window?: boolean;
  vault_direction?: string;
  source?: string;
  source_label?: string;
  callout_image_url?: string;
  callout_image_local_path?: string;
  clock_system?: {
    description?: string;
    twelve_o_clock?: string;
    three_o_clock?: string;
    six_o_clock?: string;
    nine_o_clock?: string;
  };
  tiles?: MapTile[];
  objectives?: MapObjective[];
}
