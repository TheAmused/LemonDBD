// frontend/src/types/minigame.ts

export type MinigameMode =
  | 'classic'
  | 'classic_character'
  | 'classic_killer'
  | 'classic_perk'
  | 'perk_distortion'
  | 'perk_icon'
  | 'perk'
  | 'realm_guesser'
  | 'realm'
  | 'pixel_avatar'
  | 'pixel'
  | 'killer_power'
  | 'power'
  | 'voice_line'
  | 'hook_scream'
  | 'terror_radius'
  | 'audio'
  | 'quote_lore'
  | 'quote'
  | 'emoji_riddle'
  | 'addon_guesser';

export type TargetType = 'character' | 'killer' | 'survivor' | 'perk' | 'realm' | 'addon';

export interface RoundCustomData {
  quote?: string;
  speaker?: string;
  emojis?: string;
  audio_url?: string;
  audio_synthetic_type?: string;
  blur_level?: number;
  distortion_type?: string;
  perk_type?: string;
  power_name?: string;
  power_description?: string;
  hints?: string[];
  [key: string]: unknown;
}

export interface RoundConfig {
  round_number: number;
  mode: MinigameMode;
  target_id?: number;
  target_type?: TargetType;
  custom_data?: RoundCustomData;
  max_attempts?: number;
}

export interface ChallengeDefinition {
  id?: number | string;
  title: string;
  description?: string;
  game_mode: string;
  challenge_date?: string;
  is_official?: boolean;
  rounds: RoundConfig[];
  created_at?: string;
  updated_at?: string;
}

export type AttributeStatus = 'correct' | 'partial' | 'incorrect';

export interface NumericAttributeResult {
  status: AttributeStatus;
  direction?: 'higher' | 'lower';
  value?: number;
}

export type AttributeEvaluation = AttributeStatus | NumericAttributeResult;

export interface GuessEvaluationResult {
  is_correct: boolean;
  attempt_number: number;
  guess?: {
    id: number;
    name: string;
    role?: string;
    avatar_url?: string;
    icon_url?: string;
    image_url?: string;
    [key: string]: unknown;
  };
  attributes?: Record<string, AttributeEvaluation>;
  unlocked_clues?: Record<string, unknown>;
  answer?: {
    id: number;
    name: string;
    role?: string;
    avatar_url?: string;
    icon_url?: string;
    image_url?: string;
    [key: string]: unknown;
  };
}

export interface CatalogCharacter {
  id: number;
  name: string;
  full_name?: string;
  role: 'Killer' | 'Survivor';
  gender: 'Male' | 'Female' | 'Other';
  chapter_name: string;
  release_year: number;
  is_licensed: boolean;
  height?: string;
  terror_radius?: number | string;
  terror_radius_meters?: number;
  speed?: number;
  movement_speed?: string;
  power_name?: string;
  power_description?: string;
  power_icon_url?: string;
  avatar_url?: string;
}

export interface CatalogPerk {
  id: number;
  name: string;
  role: 'Killer' | 'Survivor';
  perk_type?: string;
  is_teachable: boolean;
  character_name?: string;
  icon_url?: string;
  description?: string;
}

export interface CatalogRealm {
  id: number;
  name: string;
  raw_name?: string;
  image_url?: string;
}

export interface MinigameCatalog {
  characters?: CatalogCharacter[];
  killers: CatalogCharacter[];
  survivors: CatalogCharacter[];
  perks: CatalogPerk[];
  realms: CatalogRealm[];
}

export interface GuessedItem {
  id: number;
  name: string;
  role?: string;
  avatar_url?: string;
  icon_url?: string;
  image_url?: string;
  subtitle?: string;
  chapter_name?: string;
  release_year?: number;
  is_licensed?: boolean;
  height?: string;
  gender?: string;
  character_name?: string;
  perk_type?: string;
  is_teachable?: boolean;
  [key: string]: unknown;
}

export interface GuessRecord {
  guess: GuessedItem;
  evaluation: GuessEvaluationResult;
}

export interface ChallengeProgress {
  challengeId: string | number;
  currentRoundIndex: number;
  roundGuesses: Record<number, GuessRecord[]>;
  roundStatus: Record<number, 'in_progress' | 'won' | 'lost'>;
  isFinished: boolean;
  won: boolean;
  startedAt: number;
  completedAt?: number;
}
