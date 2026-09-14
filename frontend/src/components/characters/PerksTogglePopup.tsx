// frontend/src/components/characters/PerksTogglePopup.tsx
import React from 'react';
import { Check, Lock, X } from 'lucide-react';
import { getAssetUrl } from '@/components/character-detail/types';
import { ownsPerk } from '@/utils/characterUtils';

export interface PerksTogglePopupPerk {
  perk_id: number;
  name: string;
  /** Only meaningful next to the perk's role; prefer the two keys below. */
  character_id: number | null;
  survivor_id?: number | null;
  killer_id?: number | null;
  icon_url?: string;
  icon_local_path?: string;
}

/** The subset of the site dictionary this popup reads -- kept narrow (rather
 * than importing the full `Dictionary` type) so both call sites' dictionary
 * types (the full `Dictionary` in the onboarding wizard, and the narrower
 * `PerkDictionary` in CharactersHub) satisfy it structurally. */
export interface PerksTogglePopupDict {
  modal?: { close?: string };
  characterDetail?: {
    togglePerkOwnershipHelp?: string;
    noTeachablePerksForCharacter?: string;
    noPerks?: string;
  };
}

export interface PerksTogglePopupProps {
  character: { id?: number; name: string; category?: string } | null;
  perks: PerksTogglePopupPerk[];
  isPerkUnlocked: (perkId: number) => boolean;
  onTogglePerk: (perkId: number) => void;
  onClose: () => void;
  backendBase: string;
  /** The word for "Perks", supplied by the caller so it always matches
   * whichever locale key the caller's own trigger button uses. */
  perksLabel?: string;
  dict?: PerksTogglePopupDict;
}

/** The icon-based perk toggle popup -- teachable perks shown as their real
 * icon plus a lock/check state, click to toggle individually. Shared between
 * CharactersHub's ownership grid and the onboarding wizard so both look and
 * behave identically instead of maintaining two versions of the same modal. */
export const PerksTogglePopup: React.FC<PerksTogglePopupProps> = ({
  character,
  perks,
  isPerkUnlocked,
  onTogglePerk,
  onClose,
  backendBase,
  perksLabel,
  dict,
}) => {
  if (!character) return null;

  // Matched on the key for this character's own side. A bare id comparison
  // would pair a survivor's perks with the killer who shares that number.
  const characterPerks =
    character.id === undefined
      ? []
      : perks.filter((p) => ownsPerk(p, character.id as number, character.category));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perks-toggle-popup-title"
    >
      <div onClick={onClose} className="fixed inset-0 bg-bg-primary/70 backdrop-blur-md" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border-color bg-bg-surface shadow-2xl text-text-primary transition-colors"
      >
        <div className="flex items-center justify-between border-b border-border-color p-5">
          <h3 id="perks-toggle-popup-title" className="text-base font-bold text-text-primary">
            {character.name} {perksLabel}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            aria-label={dict?.modal?.close}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {dict?.characterDetail?.togglePerkOwnershipHelp && (
          <p className="px-5 pt-4 text-[11px] text-text-muted">
            {dict.characterDetail.togglePerkOwnershipHelp}
          </p>
        )}
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4">
            {characterPerks.map((perk) => {
              const isUnlocked = isPerkUnlocked(perk.perk_id);
              return (
                <button
                  key={perk.perk_id}
                  type="button"
                  onClick={() => onTogglePerk(perk.perk_id)}
                  className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl p-1 text-center transition-transform hover:scale-105 active:scale-95"
                >
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24">
                    <img
                      src={getAssetUrl(backendBase, perk.icon_local_path, perk.icon_url)}
                      alt={perk.name}
                      className={`h-full w-full object-contain ${isUnlocked ? '' : 'grayscale opacity-50'}`}
                    />
                    <div
                      className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border backdrop-blur-md ${
                        isUnlocked
                          ? 'border-accent-green/40 bg-accent-green/20 text-accent-green'
                          : 'border-border-color bg-bg-surface text-text-muted'
                      }`}
                    >
                      {isUnlocked ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    </div>
                  </div>
                  <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-text-primary">
                    {perk.name}
                  </span>
                </button>
              );
            })}
          </div>
          {characterPerks.length === 0 && (
            <p className="text-xs text-text-muted italic">
              {dict?.characterDetail?.noTeachablePerksForCharacter || dict?.characterDetail?.noPerks}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerksTogglePopup;
