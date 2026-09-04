// frontend/src/types/userShowcase.ts

export interface MainLoadout {
  characterName: string;
  prestige: number; // 1 to 100
  perkIds: (number | null)[]; // 4 slots
}

export interface UserShowcaseState {
  playerTitle: string;
  devotionLevel: number; // 1 to 99
  gradeRank: string; // e.g. "Iridescent I"
  survivorMain: MainLoadout;
  killerMain: MainLoadout;
}

export const PLAYER_TITLES = [
  'The Fogwalker',
  'Apex Predator',
  'Hex Cleanser',
  'Basement Architect',
  'Trial Champion',
  'Devoted Survivor',
  'Entity Whisperer',
  'Loop God',
  'The Merciless',
  'Campfire Veteran',
] as const;

export type PlayerTitle = (typeof PLAYER_TITLES)[number];

export const GRADE_EMBLEMS = [
  'Iridescent I',
  'Iridescent II',
  'Gold I',
  'Silver I',
  'Bronze I',
  'Ash I',
  'Ash IV',
] as const;

export type GradeEmblem = (typeof GRADE_EMBLEMS)[number];

export const DEFAULT_SHOWCASE_STATE: UserShowcaseState = {
  playerTitle: 'The Fogwalker',
  devotionLevel: 0,
  gradeRank: 'Ash IV',
  survivorMain: {
    characterName: 'Feng Min',
    prestige: 0,
    perkIds: [null, null, null, null],
  },
  killerMain: {
    characterName: 'The Blight',
    prestige: 0,
    perkIds: [null, null, null, null],
  },
};
