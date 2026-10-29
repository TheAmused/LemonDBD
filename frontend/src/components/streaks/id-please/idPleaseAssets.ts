// frontend/src/components/streaks/id-please/idPleaseAssets.ts
import type { IdPleaseDifficulty, IdPleaseSide } from '@/types/idPleaseStreak';

/** 0 is the card artwork; 1 to 3 are Milestones, Hardcore and Hardcore+ (3 is the ruined mirror). */
const IMAGE_LEVEL: Record<IdPleaseDifficulty, 1 | 2 | 3> = { milestones: 1, hardcore: 2, hardcore_plus: 3 };

const sideLetter = (side: IdPleaseSide) => (side === 'killer' ? 'k' : 's');

/** The artwork of a difficulty on a side. */
export function idPleaseDifficultyImage(side: IdPleaseSide, difficulty: IdPleaseDifficulty): string {
  return `/images/streaks/id-please/${sideLetter(side)}${IMAGE_LEVEL[difficulty]}.webp`;
}

/** The card artwork: the killer tab shows the killer art, the survivor and combined tabs the survivor art. */
export function idPleaseCardImage(role: string): string {
  return `/images/streaks/id-please/${role === 'killer' ? 'k' : 's'}0.webp`;
}

export const ID_PLEASE_DIFFICULTY_TONE = { milestones: 'green', hardcore: 'amber', hardcore_plus: 'red' } as const;

/** Characters of `side` live in separate folders of avatars. */
export const avatarFolder = (side: IdPleaseSide) => (side === 'killer' ? 'killers' : 'survivors');
