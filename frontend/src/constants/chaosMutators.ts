// frontend/src/constants/chaosMutators.ts
import { ChaosMutator } from '@/types/chaos';

export const CHAOS_MUTATORS: readonly ChaosMutator[] = [
  {
    id: 'no_exhaustion',
    name: 'No Exhaustion Perks',
    description:
      'Exhaustion perks are forbidden! Exhaustion perks are grayed out and strictly blocked from being selected.',
    type: 'curse',
    icon: '🚫',
    badgeBg: 'bg-rose-950/90',
    borderColor: 'border-rose-500',
    textColor: 'text-rose-300',
    blockedPerkKeywords: ['exhausted', 'exhaustion'],
  },
  {
    id: 'blindness',
    name: 'Curse of Blindness',
    description:
      'Perk icons and names are obscured during the trial! Rely purely on your memory.',
    type: 'curse',
    icon: '👁️',
    badgeBg: 'bg-purple-950/90',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-300',
  },
  {
    id: 'meme_loadout',
    name: 'Meme / Off-Meta Loadout',
    description:
      'Must run gimmick / off-meta perk combinations for maximum trial chaos!',
    type: 'curse',
    icon: '🤡',
    badgeBg: 'bg-amber-950/90',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-300',
  },
  {
    id: 'hex_boon_only',
    name: 'Hex & Boon Ritual',
    description:
      'Trial bound by ancient totems! Hex and Boon perks take priority.',
    type: 'curse',
    icon: '🔮',
    badgeBg: 'bg-indigo-950/90',
    borderColor: 'border-indigo-500',
    textColor: 'text-indigo-300',
  },
  {
    id: 'negative_only',
    name: 'Curse of Sacrifice',
    description:
      'The Entity demands a price. At least one drawn perk will be a genuine handicap.',
    type: 'curse',
    icon: '💀',
    badgeBg: 'bg-rose-950/90',
    borderColor: 'border-rose-600',
    textColor: 'text-rose-300',
  },
];

export const EXHAUSTION_PERK_NAMES: ReadonlySet<string> = new Set([
  'adrenaline',
  'balanced landing',
  'dead hard',
  'lithe',
  'sprint burst',
  'overcome',
  'smash hit',
  'background player',
  'finesse',
  'dramaturgy',
  'head on',
]);

export const MEME_PERK_NAMES: ReadonlySet<string> = new Set([
  'no mither',
  'diversion',
  'head on',
  'plot twist',
  'red herring',
  'slippery meat',
  'blast mine',
  'flashbang',
  'scene partner',
  'dramaturgy',
  'deception',
  'bardic inspiration',
  'up the ante',
  'autodidact',
  'power struggle',
  'mad grit',
  'insidious',
  'monstrous shrine',
  'unrelenting',
  'game afoot',
  'coup de grâce',
  'coup de grace',
  'deerstalker',
  'rancor',
  'trail of torment',
]);

// Perks with a genuine built-in drawback/handicap, not just "off-meta."
// Deliberately starts small (one entry) rather than a padded list that
// might misjudge a perk's actual balance -- extend this list only when
// explicitly asked to.
export const NEGATIVE_PERK_NAMES: ReadonlySet<string> = new Set([
  'no mither',
]);
