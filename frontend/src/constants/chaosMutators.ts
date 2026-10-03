// frontend/src/constants/chaosMutators.ts
import { ChaosMutator } from '@/types/chaos';

const SURVIVOR_CHAOS_MUTATORS: readonly ChaosMutator[] = [
  {
    id: 'no_exhaustion',
    name: 'Curse of Exhaustion',
    description:
      'Exhaustion perks have their drop chance reduced by 50% this trial.',
    type: 'curse',
    icon: '🚫',
    badgeBg: 'bg-accent-rose-deep/90',
    borderColor: 'border-accent-rose',
    textColor: 'text-accent-red',
    targetRole: 'Survivor',
    blockedPerkKeywords: ['exhausted', 'exhaustion'],
  },
  {
    id: 'blindness',
    name: 'Curse of Blindness',
    description:
      'Perk icons are obscured and aura-reading drop chances are reduced by 50%!',
    type: 'curse',
    icon: '👁️',
    badgeBg: 'bg-accent-purple-deep/90',
    borderColor: 'border-accent-purple',
    textColor: 'text-accent-red',
    targetRole: 'both',
  },
  {
    id: 'solo_queue',
    name: 'Curse of Solitude',
    description:
      'Altruism and healing perks are reduced by 50%. You walk the trial alone.',
    type: 'curse',
    icon: '🐺',
    badgeBg: 'bg-bg-surface/90',
    borderColor: 'border-border-color',
    textColor: 'text-accent-red',
    targetRole: 'Survivor',
  },
  {
    id: 'meme_loadout',
    name: 'Curse of the Clown',
    description:
      'Off-meta and gimmick perks have their drop chance increased by 50% for maximum trial chaos!',
    type: 'curse',
    icon: '🤡',
    badgeBg: 'bg-accent-amber-deep/90',
    borderColor: 'border-accent-amber',
    textColor: 'text-accent-red',
    targetRole: 'both',
  },
  {
    id: 'hex_boon_only',
    name: 'Boon Ritual',
    description:
      'Boon and totem-cleansing perks have their drop chance increased by 50%!',
    type: 'curse',
    icon: '🔮',
    badgeBg: 'bg-accent-indigo-deep/90',
    borderColor: 'border-accent-indigo',
    textColor: 'text-accent-red',
    targetRole: 'Survivor',
  },
  {
    id: 'negative_only',
    name: 'Curse of Sacrifice',
    description:
      'Severe handicap and high-drawback perks have their drop chance increased by 50%.',
    type: 'curse',
    icon: '💀',
    badgeBg: 'bg-accent-rose-deep/90',
    borderColor: 'border-accent-rose',
    textColor: 'text-accent-red',
    targetRole: 'Survivor',
  },
];

const KILLER_CHAOS_MUTATORS: readonly ChaosMutator[] = [
  {
    id: 'no_slowdown',
    name: 'No Gen Slowdown',
    description:
      'Generator regression and slowdown perks have their drop chance reduced by 50% this trial!',
    type: 'curse',
    icon: '🛑',
    badgeBg: 'bg-accent-rose-deep/90',
    borderColor: 'border-accent-rose',
    textColor: 'text-accent-red',
    targetRole: 'Killer',
  },
  {
    id: 'blindness',
    name: 'Curse of Blindness',
    description:
      'Perk icons are obscured and aura-reading drop chances are reduced by 50%!',
    type: 'curse',
    icon: '👁️',
    badgeBg: 'bg-accent-purple-deep/90',
    borderColor: 'border-accent-purple',
    textColor: 'text-accent-red',
    targetRole: 'both',
  },
  {
    id: 'chase_only',
    name: 'Pure Bloodlust',
    description:
      'Chase, pallet-breaking, and aggression perks have their drop chance increased by 50%.',
    type: 'curse',
    icon: '🩸',
    badgeBg: 'bg-accent-red-deep/90',
    borderColor: 'border-accent-red',
    textColor: 'text-accent-red',
    targetRole: 'Killer',
  },
  {
    id: 'hex_roulette',
    name: 'Hex Totem Madness',
    description:
      'Hex Totem perks have their drop chance increased by 50%. Risk it all on lit totems!',
    type: 'curse',
    icon: '🔮',
    badgeBg: 'bg-accent-indigo-deep/90',
    borderColor: 'border-accent-indigo',
    textColor: 'text-accent-red',
    targetRole: 'Killer',
  },
  {
    id: 'meme_loadout',
    name: 'Curse of the Clown',
    description:
      'Off-meta and gimmick perks have their drop chance increased by 50% for maximum trial chaos!',
    type: 'curse',
    icon: '🎪',
    badgeBg: 'bg-accent-amber-deep/90',
    borderColor: 'border-accent-amber',
    textColor: 'text-accent-red',
    targetRole: 'both',
  },
  {
    id: 'negative_only',
    name: 'Curse of the Entity',
    description:
      'High-drawback obsession and handicap perks have their drop chance increased by 50%.',
    type: 'curse',
    icon: '💀',
    badgeBg: 'bg-accent-rose-deep/90',
    borderColor: 'border-accent-rose',
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
