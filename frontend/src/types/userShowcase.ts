// frontend/src/types/userShowcase.ts

export interface MainLoadout {
  characterName: string;
  /** The character's key. The name can be a translation the backend does not store, so saving sends the id when there is one. */
  characterId?: number;
  prestige: number; // 0 to 100
  perkIds: (number | null)[]; // 4 slots
}

export interface UserShowcaseState {
  playerTitle: string;
  devotionLevel: number; // 0 to 99
  gradeRank: string; // one of GRADE_EMBLEMS
  survivorMain: MainLoadout;
  killerMain: MainLoadout;
}

// The backend accepts exactly these (`SHOWCASE_PLAYER_TITLES` / `SHOWCASE_GRADE_RANKS` in
// backend/app/models/user.py); a unit test there keeps the lists in step.
export const PLAYER_TITLES = [
  'Survivor',
  'Killer',
] as const;

export const GRADE_EMBLEMS = [
  'Iridescent I',
  'Iridescent II',
  'Gold I',
  'Silver I',
  'Bronze I',
  'Ash I',
  'Ash IV',
] as const;

export const DEFAULT_SHOWCASE_STATE: UserShowcaseState = {
  playerTitle: 'Survivor',
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
