// frontend/src/components/user/MainCard.tsx
'use client';

import React from 'react';
import { PerkIcon } from '@/components/ui/PerkIcon';
import { PerkDiamondSlot } from './PerkDiamondSlot';
import type { MainLoadout } from '@/types/userShowcase';
import type { RoleCategory } from '@/types/perks';
import { getCharacterAvatarUrl } from '@/utils/perkUtils';
import { useCatalogPerks } from '@/hooks/useCatalogPerks';

import { tip } from '@/components/common/Tooltip';
import { isSurvivor as isSurvivorRole } from '@/utils/characterUtils';
import { useDictionary } from "@/context/DictionaryContext";
import { TileButton } from '@/components/common/TileButton';

interface MainCardProps {
  /** The character's side (not an ARIA role). */
  characterRole: RoleCategory;
  loadout: MainLoadout;
  onCharacterChange: (name: string) => void;
  onPrestigeChange: (prestige: number) => void;
  onPerkChange: (slotIndex: number, perkId: number | null) => void;
  onOpenCharacterModal: () => void;
  onOpenPerkModal: () => void;
  locale?: string;
}

/** Slot centres in the build diamond, in diamond widths from its middle: top, right, bottom, left. */
const SLOT_OFFSET = 0.57;
const SLOT_POSITIONS = [
  { slot: 0, x: 0, y: -SLOT_OFFSET },
  { slot: 1, x: SLOT_OFFSET, y: 0 },
  { slot: 2, x: 0, y: SLOT_OFFSET },
  { slot: 3, x: -SLOT_OFFSET, y: 0 },
] as const;
/** One diamond plus the offset on each side. */
const LOADOUT_SIZE = `calc(var(--perk-size) * ${1 + 2 * SLOT_OFFSET})`;

export const MainCard: React.FC<MainCardProps> = ({
      characterRole: role,
      loadout,
      onPerkChange,
      onOpenCharacterModal,
      onOpenPerkModal,
      locale = 'en',
    }) => {
  const dict = useDictionary();
  const isSurvivor = isSurvivorRole(role);
  // The whole perk table for four icons: it leans on the shared catalog cache,
  // so the showcase and its perk picker never pay for it twice.
  const { perks: allPerks } = useCatalogPerks(locale);

  const perksBySlot = loadout.perkIds.map((id) =>
    id !== null ? allPerks.find((p) => p.id === id) || null : null
  );

  const avatarSrc = getCharacterAvatarUrl(
    { character: loadout.characterName, category: role },
    role
  );

  return (
    <div
      aria-label={isSurvivor ? (dict.user.survivorMain) : (dict.user.killerMain)}
      className="relative overflow-hidden p-4 sm:p-5"
    >
      {/* Side-by-side: Survivor (Left = Avatar, Right = Perks) vs Killer (Left = Perks, Right = Avatar) */}
      <div
        className={`relative z-10 flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-6 ${
          !isSurvivor ? 'sm:flex-row-reverse' : ''
        }`}
      >
        {/* Left: Bigger Character Portrait & Name */}
        <div className="flex flex-col items-center text-center gap-3 shrink-0">
          <TileButton
            onClick={onOpenCharacterModal}
            {...tip(dict.user.changeMain, undefined, 'action')}
            aria-label={dict.user.changeMain}
            className="relative group w-28 h-28 sm:w-36 sm:h-36 rounded-card overflow-hidden border-2 border-border-color hover:border-accent-red shadow-lg bg-bg-elevated shrink-0 transition-all hover:scale-102 focus-visible:ring-accent-red"
          >
            <PerkIcon
              src={avatarSrc}
              alt={loadout.characterName}
              imageClassName="object-cover h-full w-full"
              fallbackIcon={
                <div className="w-full h-full flex flex-col items-center justify-center bg-bg-elevated text-text-muted font-bold">
                  <span className="text-2xl sm:text-3xl tracking-wider text-text-primary">
                    {loadout.characterName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="type-micro text-text-muted">
                    {role.toUpperCase()}
                  </span>
                </div>
              }
            />
            <div className="absolute inset-0 bg-bg-primary/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center type-label-sm text-text-inverted backdrop-blur-xs">
              {dict.user.changeMain}
            </div>
          </TileButton>

          <h3 className="max-w-45 line-clamp-2 break-words text-base sm:text-lg font-black leading-tight text-text-primary tracking-wide">
            {loadout.characterName}
          </h3>
        </div>

        {/* Right: 4-Perk Signature Diamond Loadout */}
        <div
          aria-label={dict.user.signatureLoadout}
          style={{ width: LOADOUT_SIZE, height: LOADOUT_SIZE }}
          className="relative shrink-0 [--perk-size:6rem] sm:[--perk-size:7rem]"
        >
          {SLOT_POSITIONS.map(({ slot, x, y }) => (
            <div
              key={slot}
              className="absolute left-1/2 top-1/2"
              style={{
                transform: `translate(calc(-50% + var(--perk-size) * ${x}), calc(-50% + var(--perk-size) * ${y}))`,
              }}
            >
              <PerkDiamondSlot
                slotIndex={slot}
                perk={perksBySlot[slot]}
                perkId={loadout.perkIds[slot]}
                onClick={onOpenPerkModal}
                onClear={() => onPerkChange(slot, null)}
                emptyLabel={dict.user.emptySlot}
                clearLabel={dict.user.clearPerk}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
