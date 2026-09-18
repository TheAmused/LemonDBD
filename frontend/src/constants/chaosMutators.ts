// frontend/src/constants/chaosMutators.ts
import { ChaosMutator } from '@/types/chaos';

export const SURVIVOR_CHAOS_MUTATORS: readonly ChaosMutator[] = [
  {
    id: 'no_exhaustion',
    name: 'No Exhaustion Perks',
    description:
      'Exhaustion perks have their drop chance reduced by 90% this trial.',
    type: 'curse',
    icon: '🚫',
    badgeBg: 'bg-rose-950/90',
    borderColor: 'border-rose-500',
    textColor: 'text-accent-red',
    targetRole: 'Survivor',
    blockedPerkKeywords: ['exhausted', 'exhaustion'],
  },
  {
    id: 'blindness',
    name: 'Curse of Blindness',
    description:
      'Perk icons are obscured and aura-reading drop chances are reduced by 85%!',
    type: 'curse',
    icon: '👁️',
    badgeBg: 'bg-purple-950/90',
    borderColor: 'border-purple-500',
    textColor: 'text-accent-red',
    targetRole: 'both',
  },
  {
    id: 'solo_queue',
    name: 'Curse of Solitude',
    description:
      'Altruism and healing perks are drastically reduced (-80%). You walk the trial alone.',
    type: 'curse',
    icon: '🐺',
    badgeBg: 'bg-slate-950/90',
    borderColor: 'border-slate-500',
    textColor: 'text-accent-red',
    targetRole: 'Survivor',
  },
  {
    id: 'meme_loadout',
    name: 'Meme / Off-Meta Loadout',
    description:
      'Off-meta and gimmick perks show up far more often for maximum trial chaos!',
    type: 'curse',
    icon: '🤡',
    badgeBg: 'bg-amber-950/90',
    borderColor: 'border-amber-500',
    textColor: 'text-accent-red',
    targetRole: 'both',
  },
  {
    id: 'hex_boon_only',
    name: 'Boon Ritual',
    description:
      'Trial bound by ancient totems! Boon and totem-cleansing perks take priority.',
    type: 'curse',
    icon: '🔮',
    badgeBg: 'bg-indigo-950/90',
    borderColor: 'border-indigo-500',
    textColor: 'text-accent-red',
    targetRole: 'Survivor',
  },
  {
    id: 'negative_only',
    name: 'Curse of Sacrifice',
    description:
      'The Entity demands a price. High-drawback handicap perks take priority.',
    type: 'curse',
    icon: '💀',
    badgeBg: 'bg-rose-950/90',
    borderColor: 'border-rose-600',
    textColor: 'text-accent-red',
    targetRole: 'Survivor',
  },
];

export const KILLER_CHAOS_MUTATORS: readonly ChaosMutator[] = [
  {
    id: 'no_slowdown',
    name: 'No Gen Slowdown',
    description:
      'Generator regression and slowdown perks have their drop chance reduced by 90% this trial!',
    type: 'curse',
    icon: '🛑',
    badgeBg: 'bg-rose-950/90',
    borderColor: 'border-rose-500',
    textColor: 'text-accent-red',
    targetRole: 'Killer',
  },
  {
    id: 'blindness',
    name: 'Curse of Blindness',
    description:
      'Perk icons are obscured and aura-reading drop chances are reduced by 85%!',
    type: 'curse',
    icon: '👁️',
    badgeBg: 'bg-purple-950/90',
    borderColor: 'border-purple-500',
    textColor: 'text-accent-red',
    targetRole: 'both',
  },
  {
    id: 'chase_only',
    name: 'Pure Bloodlust',
    description:
      'Chase, pallet-breaking, and aggression perks show up far more often.',
    type: 'curse',
    icon: '🩸',
    badgeBg: 'bg-red-950/90',
    borderColor: 'border-red-600',
    textColor: 'text-accent-red',
    targetRole: 'Killer',
  },
  {
    id: 'hex_roulette',
    name: 'Hex Totem Madness',
    description:
      'Hex Totem perks take priority. Risk it all on lit totems!',
    type: 'curse',
    icon: '🔮',
    badgeBg: 'bg-indigo-950/90',
    borderColor: 'border-indigo-500',
    textColor: 'text-accent-red',
    targetRole: 'Killer',
  },
  {
    id: 'meme_loadout',
    name: 'Meme / Off-Meta Loadout',
    description:
      'Off-meta and gimmick perks show up far more often for maximum trial chaos!',
    type: 'curse',
    icon: '🎪',
    badgeBg: 'bg-amber-950/90',
    borderColor: 'border-amber-500',
    textColor: 'text-accent-red',
    targetRole: 'both',
  },
  {
    id: 'negative_only',
    name: 'Curse of the Entity',
    description:
      'The Entity tests your power. High-drawback obsession perks take priority.',
    type: 'curse',
    icon: '💀',
    badgeBg: 'bg-rose-950/90',
    borderColor: 'border-rose-600',
    textColor: 'text-accent-red',
    targetRole: 'Killer',
  },
];

export function getChaosMutatorsForRole(role?: string | null): readonly ChaosMutator[] {
  const norm = (role || '').toLowerCase();
  if (norm === 'killer') {
    return KILLER_CHAOS_MUTATORS;
  }
  return SURVIVOR_CHAOS_MUTATORS;
}

// Default export maintained for backwards compatibility
export const CHAOS_MUTATORS: readonly ChaosMutator[] = SURVIVOR_CHAOS_MUTATORS;

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

export const GEN_REGRESSION_PERK_NAMES: ReadonlySet<string> = new Set([
  'scourge hook: pain resonance',
  'pop goes the weasel',
  'corrupt intervention',
  'deadlock',
  'grim embrace',
  'call of brine',
  'jolt',
  'surge',
  'eruption',
  'overcharge',
  'hex: ruin',
  'hex: pentimento',
  'oppression',
  'thanatophobia',
  'dead man\'s switch',
  'thrilling tremors',
  'merciless storm',
  'dying light',
]);

export const AURA_PERK_NAMES: ReadonlySet<string> = new Set([
  // Survivor
  'alert',
  'all-seeing',
  'better together',
  'situational awareness',
  'blood pact',
  'bond',
  'clairvoyance',
  'counterforce',
  'dark sense',
  'deja vu',
  'empathic connection',
  'empathy',
  'fogwise',
  'kindred',
  'open-handed',
  'plunderer\'s instinct',
  'rookie mechanic',
  'troubleshooter',
  'visionary',
  'wake up!',
  'windows of opportunity',
  'wiretap',
  // Killer
  'a nurse\'s calling',
  'awakened awareness',
  'barbecue & chilli',
  'barbecue and chilli',
  'bitter murmur',
  'darkness revealed',
  'deerstalker',
  'discordance',
  'floods of rage',
  'friends \'til the end',
  'gearhead',
  'i\'m all ears',
  'lethal pursuer',
  'nowhere to hide',
  'scourge hook: floods of rage',
  'territorial imperative',
  'thwack!',
  'ultimate weapon',
  'zanshin tactics',
]);

export const HEALING_ALTRUISM_PERK_NAMES: ReadonlySet<string> = new Set([
  'botany knowledge',
  'we\'ll make it',
  'empathy',
  'empathic connection',
  'autodidact',
  'we\'re gonna live forever',
  'for the people',
  'circle of healing',
  'boon: circle of healing',
  'deliverance',
  'babysitter',
  'guardian',
  'aftercare',
  'solidarity',
  'leader',
  'desperate measures',
  'resurgence',
  'no one left behind',
]);

export const CHASE_PERK_NAMES: ReadonlySet<string> = new Set([
  'enduring',
  'spirit fury',
  'bamboozle',
  'brutal strength',
  'coup de grâce',
  'coup de grace',
  'superior anatomy',
  'rapid brutality',
  'fire up',
  'dissolution',
  'hubris',
  'dark arrogance',
  'batteries included',
  'claustrophobia',
  'cruel limits',
  'save the best for last',
]);

export const MEME_PERK_NAMES: ReadonlySet<string> = new Set([
  // Survivor
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
  // Killer
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
  'agitation',
  'iron grasp',
  'distressing',
]);

export const NEGATIVE_PERK_NAMES: ReadonlySet<string> = new Set([
  'no mither',
  'object of obsession',
  'self-preservation',
  'furtive chase',
  'game afoot',
]);
