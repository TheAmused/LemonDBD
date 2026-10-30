'use client';

import React, { useState } from 'react';
import type { GauntletPlayerLoadout, Perk, Role, TierInfo } from '@/types/gauntletStreak';
import type { OwnedCharacterItem } from '@/components/streaks/useOwnedRoster';
import type { DrawPhase } from '@/components/streaks/gauntlet/useTargetDraw';
import { Star, HelpCircle } from 'lucide-react';
import { avatarUrlForCharacter, perkIconUrl, staticUrl } from '@/utils/staticUrl';
import { useCharacterDisplayName, usePerkDisplayName } from '@/context/DisplayNamesContext';
import { PerkHexIcon, LockIcon, PersonIcon } from '@/components/icons/DbdIcons';
import { PerkIcon } from '@/components/ui/PerkIcon';
import { DiamondSlot } from '@/components/ui/DiamondSlot';
import { useDictionary } from '@/context/DictionaryContext';
import { baseSlots } from '@/utils/perkSlots';
import { Img } from '@/components/common/Img';
import { Tooltip } from '@/components/common/Tooltip';

const avatarUrlFor = (name: string, role: Role, characters: OwnedCharacterItem[] = []) => {
  if (!name) return null;
  const owned = characters.find((c) => c.name === name)?.avatar_local_path;
  return staticUrl(owned) || avatarUrlForCharacter(name, role === 'survivor' ? 'survivors' : 'killers') || null;
};

const perkIconFor = (perk: Perk) => perkIconUrl(perk);

export const RevealPortrait: React.FC<{ name?: string; role: Role; phase: DrawPhase; characters: OwnedCharacterItem[] }> = ({
  name,
  role,
  phase,
  characters,
}) => {
  // The name whose picture failed; another killer gets its own try.
  const [failedName, setFailedName] = useState<string | undefined>(undefined);
  const failed = failedName !== undefined && failedName === name;
  const src = name ? avatarUrlFor(name, role, characters) : null;

  const motion = phase === 'landed' ? 'gn-land-frame' : phase === 'spinning' ? 'gn-spin-frame' : '';

  if (!src || failed) {
    return (
      <div
        className={`w-full h-full bg-bg-elevated rounded-card flex items-center justify-center text-text-muted ${motion}`}
      >
        <PersonIcon className="w-8 h-8" aria-hidden="true" />
      </div>
    );
  }

  return (
    <Img
      src={src}
      alt=""
      aria-hidden="true"
      className={`w-full h-full max-w-none object-cover rounded-card ${motion}`}
      onError={() => setFailedName(name)}
    />
  );
};

const PerkArt: React.FC<{ perk: Perk; size: string }> = ({ perk, size }) => {
  const displayName = usePerkDisplayName()(perk.name);
  const src = perkIconFor(perk);

  return (
    <PerkIcon
      perk={perk}
      src={src}
      alt={displayName}
      imageClassName={`${size} max-w-none object-contain`}
      fallbackIcon={
        <div className={`${size} flex items-center justify-center text-text-muted`}>
          <PerkHexIcon className="w-1/2 h-1/2" aria-hidden="true" />
        </div>
      }
    />
  );
};

type SlotSize = 'large' | 'small' | 'compact';

const CAPTION_CLASS: Record<SlotSize, string> = {
  large: 'mt-4 w-20 sm:w-24 xl:mt-5 xl:w-28',
  small: 'mt-3 w-20 xl:mt-4 xl:w-24',
  compact: 'mt-3 w-20',
};

const BADGE_TEXT_SIZE: Record<SlotSize, string> = {
  large: 'text-micro',
  small: 'text-micro',
  compact: 'text-micro',
};

const BADGE_BG: Record<'amber' | 'red', string> = {
  amber: 'bg-accent-amber',
  red: 'bg-accent-red',
};

const SlotChip: React.FC<{
  iconClassName: string;
  caption?: string;
  size: SlotSize;
  badge?: string;
  badgeColor?: 'amber' | 'red';
  children: React.ReactNode;
}> = ({ iconClassName, caption, size, badge, badgeColor = 'amber', children }) => (
  <div className="relative inline-flex shrink-0 flex-col items-center">
    {badge && (
      <div
        className={`absolute -top-2.5 left-1/2 hidden -translate-x-1/2 z-10 sm:block ${BADGE_BG[badgeColor]} text-text-primary ${BADGE_TEXT_SIZE[size]} font-black uppercase tracking-wide px-1.5 py-0.5 rounded-chip shadow-sm whitespace-nowrap`}
      >
        {badge}
      </div>
    )}
    <DiamondSlot size={size} className={iconClassName}>
      {children}
    </DiamondSlot>
    {caption && <span className={`${CAPTION_CLASS[size]} text-center text-xs font-bold leading-tight text-text-primary line-clamp-2`}>{caption}</span>}
  </div>
);

const SLOT_ICON_SIZE: Record<SlotSize, string> = {
  large: 'w-5 h-5 sm:w-6 sm:h-6 xl:w-7 xl:h-7',
  small: 'w-5 h-5 xl:w-6 xl:h-6',
  compact: 'w-4 h-4',
};

const TEACHABLE_ACCENT = {
  amber: 'bg-accent-amber/10 border-accent-amber/40 text-accent-amber',
  red: 'bg-accent-red/10 border-accent-red/40 text-accent-red',
};

/** Hover body of the teachable slot: the character's own perks to pick from. */
const TeachablePerkList: React.FC<{ perks: Perk[] }> = ({ perks }) => (
  <ul className="flex items-center justify-center">
    {perks.map((perk) => (
      <li key={perk.id ?? perk.name} className="flex h-20 w-20 shrink-0 items-center justify-center">
        <PerkArt perk={perk} size="h-20 w-20" />
      </li>
    ))}
  </ul>
);

/** The "own unique perk goes here" slot, always paired with its badge.
 * `accent` lets squad color each player's slot differently; hovering it lists the character's own perks. */
const TeachableSlot: React.FC<{ size: SlotSize; perks: Perk[]; accent?: 'amber' | 'red'; }> = ({ size, perks, accent = 'amber' }) => {
  const dict = useDictionary();
  return (
    <Tooltip variant="item" content={<TeachablePerkList perks={perks} />} disabled={perks.length === 0}>
      <SlotChip
        size={size}
        iconClassName={TEACHABLE_ACCENT[accent]}
        badge={dict.streaks.teachableBadge}
        badgeColor={accent}
      >
        <Star className={SLOT_ICON_SIZE[size]} />
      </SlotChip>
    </Tooltip>
  );
};

interface PerkSlotsRowProps {
  tierInfo: TierInfo;
  randomPerks: Perk[];
  /** The character's own perks, listed when hovering the teachable slot. */
  characterPerks: Perk[];
  displayName: string;
  size?: SlotSize;
  teachableAccent?: 'amber' | 'red';
  /** Free slots bought with tokens for this match. */
  bonusSlots?: number;
}

/** A single horizontal row of labelled slot chips. */
const PerkSlotsRow: React.FC<PerkSlotsRowProps> = ({ tierInfo, randomPerks, characterPerks, displayName, size = 'small', teachableAccent, bonusSlots = 0 }) => {
  const dict = useDictionary();
  const perkLimit = tierInfo.perk_limit;
  const charactersPerksOnly = tierInfo.character_perks_only;
  const slots = [0, 1, 2, 3];
  const ownSlots = baseSlots(tierInfo);
  const perkDisplayName = usePerkDisplayName();
  const large = size === 'large';
  const iconSize = SLOT_ICON_SIZE[size];
  const perkArtSize = large ? 'w-14 h-14 sm:w-20 sm:h-20 xl:w-28 xl:h-28' : size === 'compact' ? 'w-12 h-12 xl:w-14 xl:h-14' : 'w-14 h-14 xl:w-20 xl:h-20';

  return (
    <div>
      {charactersPerksOnly && perkLimit === 0 && randomPerks.length === 0 && (
        <p className="mb-1.5 type-caption text-text-secondary">
          {dict.streaks.noPerksThisTrial} {displayName}{' '}
          {dict.streaks.goesInBare}
        </p>
      )}
      <ul className={large ? 'flex items-start gap-5 sm:gap-7 xl:gap-12' : size === 'compact' ? 'flex items-start gap-4 xl:gap-6' : 'flex items-start gap-5 xl:gap-10'}>
        {slots.map((idx) => {
          if (idx === 0 && perkLimit === 0 && randomPerks.length > 0) {
            const perk = randomPerks[0];
            return (
              <li key="random-perk">
                <SlotChip
                  size={size}
                  iconClassName="border-transparent"
                  caption={perkDisplayName(perk.name)}
                >
                  <PerkArt perk={perk} size={perkArtSize} />
                </SlotChip>
              </li>
            );
          }

          if (idx >= ownSlots && idx < ownSlots + bonusSlots) {
            // A slot bought with tokens: any perk the player likes, so it looks like a survivor's free slot.
            return (
              <li key={`bonus-${idx}`}>
                <SlotChip
                  size={size}
                  iconClassName="bg-bg-elevated border-border-color text-text-muted"
                >
                  <HelpCircle className={iconSize} />
                </SlotChip>
              </li>
            );
          }

          if (idx >= perkLimit) {
            return (
              <li key={`locked-${idx}`}>
                <SlotChip
                  size={size}
                  iconClassName="bg-bg-elevated/60 border-dashed border-border-color opacity-60 text-text-muted"
                >
                  <LockIcon className={iconSize} />
                </SlotChip>
              </li>
            );
          }

          if (charactersPerksOnly) {
            // Every filled slot is one of the killer's own teachables, and which ones is the player's pick,
            // so it is drawn as the generic teachable slot rather than a specific perk that would look assigned.
            return <li key={`char-slot-${idx}`}>
              <TeachableSlot size={size} perks={characterPerks} accent={teachableAccent} />
            </li>;
          }

          if (idx === 0) {
            // One of several choices, not a specific assigned perk -- a symbol
            // for "your character's own unique perk goes here", not a preview.
            return <li key="character-slot">
              <TeachableSlot size={size} perks={characterPerks} accent={teachableAccent} />
            </li>;
          }

          return (
            <li key={`free-${idx}`}>
              <SlotChip
                size={size}
                iconClassName="bg-bg-elevated border-border-color text-text-muted"
              >
                <HelpCircle className={iconSize} />
              </SlotChip>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

interface CompactPlayerBuildProps {
  index: number;
  player: GauntletPlayerLoadout;
  role: Role;
  characters: OwnedCharacterItem[];
  tierInfo: TierInfo;
  playersPerCharacter: number;
  isTeam: boolean;
  bonusSlots?: number;
}

export const CompactPlayerBuild: React.FC<CompactPlayerBuildProps> = ({ index, player, role, characters, tierInfo, playersPerCharacter, isTeam, bonusSlots = 0 }) => {
  const dict = useDictionary();
  const displayName = useCharacterDisplayName()(player.character);
  const [avatarError, setAvatarError] = useState<boolean>(false);
  const avatarSrc = avatarUrlFor(player.character, role, characters);
  const shared = playersPerCharacter > 1;
  const playerLabel = dict.streaks.playerLabel;

  const avatarBox = (sizeClass: string, iconClass: string) => (
    <div
      className={`${sizeClass} shrink-0 rounded-card bg-bg-elevated border-2 border-border-color flex items-center justify-center overflow-hidden`}
    >
      {avatarSrc && !avatarError ? (
        <Img
          src={avatarSrc}
          alt={displayName}
          className="w-full h-full max-w-none object-cover"
          onError={() => setAvatarError(true)}
        />
      ) : (
        <div className="w-full h-full bg-bg-elevated flex items-center justify-center text-text-muted">
          <PersonIcon className={iconClass} aria-hidden="true" />
        </div>
      )}
    </div>
  );

  if (!isTeam) {
    return (
      <div className="flex w-full flex-col items-center gap-5 sm:flex-row sm:gap-8">
        <div className="flex shrink-0 items-center gap-3 sm:w-1/3 sm:flex-col sm:border-r sm:border-border-color sm:pr-8">
          {avatarBox('w-16 h-16 sm:w-28 sm:h-28', 'w-8 h-8 sm:w-12 sm:h-12')}
          <span className="text-base font-bold text-text-primary text-center leading-tight">{displayName}</span>
        </div>
        <div className="flex min-w-0 items-center justify-center sm:flex-1">
          <PerkSlotsRow
            tierInfo={tierInfo}
            randomPerks={player.random_perks ?? []}
            characterPerks={player.character_perks}
            displayName={displayName}
            size="large"
            bonusSlots={bonusSlots}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4 px-1 sm:min-h-44.5 sm:flex-row sm:px-4">
      <div className="flex shrink-0 items-center gap-3 sm:w-1/3 sm:flex-col sm:gap-2 sm:border-r sm:border-border-color sm:pr-4">
        {avatarBox('w-14 h-14 sm:w-24 sm:h-24', 'w-8 h-8 sm:w-10 sm:h-10')}
        <span className="text-xs font-bold text-text-primary text-center leading-tight">{displayName}</span>
      </div>
      <div className="flex min-w-0 flex-col items-center justify-center gap-6 sm:flex-1 sm:gap-9">
        {Array.from({ length: playersPerCharacter }, (_, n) => (
          <div key={n} className="flex items-center gap-2 sm:gap-4">
            {shared && (
              <span className="w-10 shrink-0 text-micro sm:w-14 uppercase font-black text-accent-red tracking-wider">
                {playerLabel} {index * playersPerCharacter + n + 1}
              </span>
            )}
            <PerkSlotsRow
              tierInfo={tierInfo}
              randomPerks={player.random_perks ?? []}
              characterPerks={player.character_perks}
              displayName={displayName}
              size={shared ? 'compact' : 'small'}
              teachableAccent={shared ? (n === 0 ? 'amber' : 'red') : undefined}
              bonusSlots={bonusSlots}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
