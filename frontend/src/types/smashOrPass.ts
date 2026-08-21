// frontend/src/types/smashOrPass.ts

export type CharacterRole = 'Survivor' | 'Killer' | 'all';
export type CharacterGender = 'female' | 'male' | 'monster_other' | 'all';
export type VoteType = 'smash' | 'pass' | 'super_smash';

export type TierClassification =
  | 'God Tier'
  | 'Fatal Attraction'
  | 'Friendzone'
  | 'Eldritch Void';

export interface EntityMetadata {
  title?: string;
  tagline?: string;
  bio?: string;
  quote?: string;
  lore_quote?: string;
  green_flags?: string[];
  greenFlags?: string[];
  red_flags?: string[];
  redFlags?: string[];
  turn_on?: string;
  turnOn?: string;
  dealbreaker?: string;
  dating_vibe?: string;
  datingVibe?: string;
  chapter?: string;
  danger_level?: 'Low' | 'Medium' | 'High' | 'Lethal' | 'Eldritch' | string;
  archetype?: string;
  compatibility_tags?: string[];
  audio_cue?: string;
  backstory?: string;
  [key: string]: any;
}

export interface EntityStatItem {
  id: string;
  entity_id: string;
  smash_count: number;
  pass_count: number;
  super_smash_count: number;
  total_votes: number;
  smash_rate: number;
  chaos_rating: number;
  rank?: number | null;
  updated_at?: string | null;
}

export interface EntityItem {
  id: string;
  roster_id: string;
  slug: string;
  name: string;
  role: CharacterRole | string;
  gender: CharacterGender | string;
  media_url?: string | null;
  media_type?: string;
  metadata?: EntityMetadata;
  metadata_json?: EntityMetadata;
  order_index?: number;
  is_active?: boolean;
  stat?: EntityStatItem | null;
  created_at?: string | null;
}

export interface RosterItem {
  id: string;
  slug: string;
  name_i18n_key: string;
  description_i18n_key: string;
  cover_image_url?: string | null;
  theme_color: string;
  category: string;
  is_nsfw: boolean;
  is_active: boolean;
  entity_count?: number;
  character_count?: number;
  total_votes?: number;
  name?: string;
  description?: string;
  created_at?: string | null;
}

export interface FeedResponse {
  roster: RosterItem;
  entities: EntityItem[];
  total_remaining: number;
}

export interface LeaderboardItem {
  id: string;
  slug: string;
  name: string;
  role: string;
  gender: string;
  media_url?: string | null;
  media_type?: string;
  metadata?: EntityMetadata;
  stat?: EntityStatItem | null;
  tier: TierClassification | string;
  rank: number;
  smash_count?: number;
  pass_count?: number;
  super_smash_count?: number;
  total_votes?: number;
  smash_rate?: number;
  chaos_rating?: number;
  character_slug?: string;
  character_name?: string;
  edition?: string;
}

export interface VotePayload {
  entity_id?: string;
  character_slug?: string;
  slug?: string;
  vote_type: VoteType;
  vote?: VoteType;
  roster_slug?: string;
  edition?: string;
  session_id?: string;
  user_id?: number;
}

export interface VoteResponse {
  status?: string;
  data: EntityItem & {
    character_slug?: string;
    character_name?: string;
    edition?: string;
    smash_count?: number;
    pass_count?: number;
    super_smash_count?: number;
    total_votes?: number;
    smash_rate?: number;
    chaos_rating?: number;
    [key: string]: any;
  };
}

export interface ChaosPersonaScore {
  chaos_score: number;
  danger_rating: string;
  persona_archetype: string;
  flavor_text: string;
  compatibility_percent: number;
}

export interface SmashFilterOptions {
  role?: string;
  gender?: string;
  limit?: number;
}

export interface SmashLeaderboardOptions {
  role?: string;
  gender?: string;
  sortBy?: 'smash_rate' | 'total_votes' | 'smash_count' | 'chaos_rating' | string;
  limit?: number;
}
