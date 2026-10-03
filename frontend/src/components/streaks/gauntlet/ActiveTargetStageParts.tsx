'use client';

import React, { useState, useEffect } from 'react';
import type { GauntletPlayerLoadout, Perk, Role, TierInfo } from '@/types/gauntletStreak';
import type { OwnedCharacterItem } from '@/components/streaks/gauntlet/useOwnedCharacters';
import { DrawPhase } from '@/components/streaks/gauntlet/useTargetDraw';
import { User, Sparkles, Star, Lock, HelpCircle } from 'lucide-react';
import { avatarUrlForCharacter, perkIconUrl, staticUrl } from '@/utils/staticUrl';
import { useCharacterDisplayName, usePerkDisplayName } from '@/context/DisplayNamesContext';
import { KillerIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';

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
  const [failed, setFailed] = useState<boolean>(false);
  const src = name ? avatarUrlFor(name, role, characters) : null;

  useEffect(() => setFailed(false), [name]);

  const motion = phase === 'landed' ? 'gn-land-frame' : phase === 'spinning' ? 'gn-spin-frame' : '';

  if (!src || failed) {
    return (
      <div
        className={`w-full h-full bg-bg-elevated rounded-xl flex items-center justify-center text-text-muted ${motion}`}
      >
        {role === 'survivor' ? <User className="w-8 h-8" aria-hidden="true" /> : <KillerIcon className="w-8 h-8" aria-hidden="true" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={`w-full h-full max-w-none object-cover rounded-xl ${motion}`}
      onError={() => setFailed(true)}
    />
  );
};

const PerkArt: React.FC<{ perk: Perk; size: string }> = ({ perk, size }) => {
  const [failed, setFailed] = useState<boolean>(false);
  const displayName = usePerkDisplayName()(perk.name);
  const src = perkIconFor(perk);

  if (!src || failed) {
    return (
      <div className={`${size} flex items-center justify-center text-text-muted`}>
        <Sparkles className="w-1/2 h-1/2" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={displayName}
      className={`${size} max-w-none object-contain`}
      onError={() => setFailed(true)}
    />
  );
};

type SlotSize = 'large' | 'small' | 'compact';

const SLOT_ICON_BASE: Record<SlotSize, string> = {
  large: 'w-[4.5rem] h-[4.5rem]',
  small: 'w-16 h-16',
  compact: 'w-12 h-12',
};

// The diamond is rotated, so its corners overhang the layout box; the caption clears them.
const CAPTION_CLASS: Record<SlotSize, string> = {
  large: 'mt-5 w-28',
  small: 'mt-4 w-24',
  compact: 'mt-3 w-20',
};

const slotIconBase = (size: SlotSize) =>
  `${SLOT_ICON_BASE[size]} shrink-0 rounded-md rotate-45 flex items-center justify-center border relative`;

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
  caption: string;
  size: SlotSize;
  badge?: string;
  badgeColor?: 'amber' | 'red';
  children: React.ReactNode;
}> = ({ iconClassName, caption, size, badge, badgeColor = 'amber', children }) => (
  <div className="relative inline-flex shrink-0 flex-col items-center">
    {badge && (
      <div
        className={`absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 ${BADGE_BG[badgeColor]} text-text-primary ${BADGE_TEXT_SIZE[size]} font-black uppercase tracking-wide px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap`}
      >
        {badge}
      </div>
    )}
    <div className={`${slotIconBase(size)} ${iconClassName}`}>
      <div className="-rotate-45 flex items-center justify-center">{children}</div>
    </div>
    <span className={`${CAPTION_CLASS[size]} text-center text-xs font-bold leading-tight text-text-primary line-clamp-2`}>{caption}</span>
  </div>
);

const SLOT_ICON_SIZE: Record<SlotSize, string> = {
  large: 'w-7 h-7',
  small: 'w-6 h-6',
  compact: 'w-4 h-4',
};

const TEACHABLE_ACCENT = {
  amber: 'bg-accent-amber/10 border-accent-amber/40 text-accent-amber',
  red: 'bg-accent-red/10 border-accent-red/40 text-accent-red',
};

/** The "own unique perk goes here" slot, always paired with its badge.
 * `accent` lets squad color each player's slot differently. */
const TeachableSlot: React.FC<{ size: SlotSize; accent?: 'amber' | 'red'; }> = ({ size, accent = 'amber' }) => {
  const dict = useDictionary();
  return (
  <SlotChip
    size={size}
    iconClassName={TEACHABLE_ACCENT[accent]}
    caption={(dict.streaks.ownPerkOf).replace(/:$/, '')}
    badge={dict.streaks.teachableBadge}
    badgeColor={accent}
  >
    <Star className={SLOT_ICON_SIZE[size]} />
  </SlotChip>
);
};

interface PerkSlotsRowProps {
  tierInfo: TierInfo;
  charPerks: Perk[];
  randomPerks: Perk[];
  displayName: string;
  size?: SlotSize;
  teachableAccent?: 'amber' | 'red';
}

/** A single horizontal row of labelled slot chips. */
const PerkSlotsRow: React.FC<PerkSlotsRowProps> = ({ tierInfo, charPerks, randomPerks, displayName, size = 'small', teachableAccent }) => {
  const dict = useDictionary();
  const perkLimit = tierInfo.perk_limit;
  const charactersPerksOnly = tierInfo.character_perks_only;
  const slots = [0, 1, 2, 3];
  const perkDisplayName = usePerkDisplayName();
  const large = size === 'large';
  const iconSize = SLOT_ICON_SIZE[size];
  const perkArtSize = large ? 'w-28 h-28' : size === 'compact' ? 'w-14 h-14' : 'w-20 h-20';

  return (
    <div>
      {charactersPerksOnly && perkLimit === 0 && (
        <p className="mb-1.5 type-caption text-text-secondary">
          {dict.streaks.noPerksThisTrial} {displayName}{' '}
          {dict.streaks.goesInBare}
        </p>
      )}
      <div className={large ? 'flex items-center gap-12' : size === 'compact' ? 'flex items-center gap-6' : 'flex items-center gap-10'} role="list">
        {slots.map((idx) => {
          if (idx === 0 && perkLimit === 0 && randomPerks.length > 0) {
            const perk = randomPerks[0];
            return (
              <SlotChip
                key="random-perk"
                size={size}
                iconClassName="border-transparent"
                caption={perkDisplayName(perk.name)}
              >
                <PerkArt perk={perk} size={perkArtSize} />
              </SlotChip>
            );
          }

          if (idx >= perkLimit) {
            return (
              <SlotChip
                key={`locked-${idx}`}
                size={size}
                iconClassName="bg-bg-elevated/60 border-dashed border-border-color opacity-60 text-text-muted"
                caption={dict.streaks.lockedSuffix ? dict.streaks.lockedSuffix[0].toUpperCase() + dict.streaks.lockedSuffix.slice(1) : 'Locked'}
              >
                <Lock className={iconSize} />
              </SlotChip>
            );
          }

          if (charactersPerksOnly) {
            // Every filled slot is one of the killer's own teachables, not a free pick.
            const ownPerk = charPerks[idx];
            return (
              <SlotChip
                key={`char-slot-${idx}`}
                size={size}
                iconClassName={ownPerk ? 'border-transparent' : 'bg-accent-red/10 border-accent-red/40 text-accent-red'}
                caption={ownPerk ? perkDisplayName(ownPerk.name) : (dict.streaks.ownPerkOf).replace(/:$/, '')}
              >
                {ownPerk ? <PerkArt perk={ownPerk} size={perkArtSize} /> : <HelpCircle className={iconSize} />}
              </SlotChip>
            );
          }

          if (idx === 0) {
            // One of several choices, not a specific assigned perk -- a symbol
            // for "your character's own unique perk goes here", not a preview.
            return <TeachableSlot key="character-slot" size={size} accent={teachableAccent} />;
          }

          return (
            <SlotChip
              key={`free-${idx}`}
              size={size}
              iconClassName="bg-bg-elevated border-border-color text-text-muted"
              caption={dict.streaks.freePickCaption}
            >
              <HelpCircle className={iconSize} />
            </SlotChip>
          );
        })}
      </div>
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
}

export const CompactPlayerBuild: React.FC<CompactPlayerBuildProps> = ({ index, player, role, characters, tierInfo, playersPerCharacter, isTeam }) => {
  const dict = useDictionary();
  const displayName = useCharacterDisplayName()(player.character);
  const [avatarError, setAvatarError] = useState<boolean>(false);
  const avatarSrc = avatarUrlFor(player.character, role, characters);
  const shared = playersPerCharacter > 1;
  const playerLabel = dict.streaks.playerLabel;

  const avatarBox = (sizeClass: string, iconClass: string) => (
    <div
      className={`${sizeClass} shrink-0 rounded-xl bg-bg-elevated border-2 border-border-color flex items-center justify-center overflow-hidden`}
    >
      {avatarSrc && !avatarError ? (
        <img
          src={avatarSrc}
          alt={displayName}
          className="w-full h-full max-w-none object-cover"
          onError={() => setAvatarError(true)}
        />
      ) : (
        <div className="w-full h-full bg-bg-elevated flex items-center justify-center text-text-muted">
          {role === 'survivor' ? <User className={iconClass} aria-hidden="true" /> : <KillerIcon className={iconClass} aria-hidden="true" />}
        </div>
      )}
    </div>
  );

  if (!isTeam) {
    return (
      <div className="flex w-full items-center gap-8">
        <div className="w-1/3 shrink-0 flex flex-col items-center gap-3 border-r border-border-color pr-8">
          {avatarBox('w-24 h-24 sm:w-28 sm:h-28', 'w-12 h-12')}
          <span className="text-base font-bold text-text-primary text-center leading-tight">{displayName}</span>
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <PerkSlotsRow
            tierInfo={tierInfo}
            charPerks={player.character_perks ?? []}
            randomPerks={player.random_perks ?? []}
            displayName={displayName}
            size="large"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-4 px-3 sm:px-4 min-h-[178px]">
      <div className="w-1/3 shrink-0 flex flex-col items-center gap-2 border-r border-border-color pr-4">
        {avatarBox('w-20 h-20 sm:w-24 sm:h-24', 'w-10 h-10')}
        <span className="text-xs font-bold text-text-primary text-center leading-tight">{displayName}</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-9">
        {Array.from({ length: playersPerCharacter }, (_, n) => (
          <div key={n} className="flex items-center gap-4">
            {shared && (
              <span className="w-14 shrink-0 text-micro uppercase font-black text-accent-red tracking-wider">
                {playerLabel} {index * playersPerCharacter + n + 1}
              </span>
            )}
            <PerkSlotsRow
              tierInfo={tierInfo}
              charPerks={player.character_perks ?? []}
              randomPerks={player.random_perks ?? []}
              displayName={displayName}
              size={shared ? 'compact' : 'small'}
              teachableAccent={shared ? (n === 0 ? 'amber' : 'red') : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
