'use client';
// frontend/src/components/onboarding/wizard/ChapterCharacterPanel.tsx
import React from 'react';
import { CharacterOwnershipOverlay } from '@/components/characters/CharacterOwnershipOverlay';
import { useDictionary } from '@/context/DictionaryContext';
import { type ChapterGroup, type OnboardingCharacter, resolveOnboardingAvatar } from '../CharacterOnboardingWizardParts';

interface ChapterCharacterPanelProps {
  group: ChapterGroup;
  backendBase: string;
  isCharacterOwned: (character: OnboardingCharacter) => boolean;
  getCharacterPerkStats: (characterId: number, role: string) => { total: number; unlocked: number };
  setCharacterOwned: (characterId: number, role: string, owned: boolean) => void;
  onOpenPerks: (character: OnboardingCharacter) => void;
}

/** The expanded chapter's characters: click a portrait to own it, open its perks when not owned. */
export function ChapterCharacterPanel({
  group,
  backendBase,
  isCharacterOwned,
  getCharacterPerkStats,
  setCharacterOwned,
  onOpenPerks,
}: ChapterCharacterPanelProps) {
  const dict = useDictionary();
  const t = dict.onboarding;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-3 rounded-2xl border border-border-color bg-bg-surface p-3">
      {group.characters.map((c) => {
        const isOwned = isCharacterOwned(c);
        const perkStats = getCharacterPerkStats(c.id, c.category);
        const hasPartialPerks = !isOwned && perkStats.unlocked > 0;
        return (
          <div
            key={c.id}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-border-color bg-bg-surface"
          >
            <button
              type="button"
              onClick={() => setCharacterOwned(c.id, c.category, !isOwned)}
              className="relative aspect-[3/4] w-full cursor-pointer"
            >
              <img
                src={resolveOnboardingAvatar(backendBase, c)}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
              <CharacterOwnershipOverlay
                isOwned={isOwned}
                hasPartialPerks={hasPartialPerks}
                avatarSrc={resolveOnboardingAvatar(backendBase, c)}
                lockedTitle={dict.modal.unownedPerk}
                ownedTitle={dict.filters.ownedOnly}
              />
              <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-bg-primary/80 px-1.5 py-0.5 type-strong-2xs text-text-inverted text-center">
                {c.name}
              </span>
            </button>
            {!isOwned && perkStats.total > 0 && (
              <button
                type="button"
                onClick={() => onOpenPerks(c)}
                className="w-full border-t border-border-color bg-accent-amber/10 px-1.5 py-1 type-strong-2xs text-accent-amber hover:bg-accent-amber/20 transition-colors cursor-pointer"
              >
                {t.perksButton} ({perkStats.unlocked}/{perkStats.total})
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
