'use client';
// frontend/src/components/onboarding/wizard/ChapterCharacterPanel.tsx
import React from 'react';
import { CharacterCard } from '@/components/characters/hub/CharacterCard';
import { Surface } from '@/components/common/Surface';
import {
  type ChapterGroup,
  type OnboardingCharacter,
  CHARACTER_GRID_CLASS,
} from '../CharacterOnboardingWizardParts';

interface ChapterCharacterPanelProps {
  group: ChapterGroup;
  locale: string;
  backendBase: string;
  isCharacterOwned: (character: OnboardingCharacter) => boolean;
  getCharacterPerkStats: (characterId: number, role: string) => { total: number; unlocked: number };
  setCharacterOwned: (characterId: number, role: string, owned: boolean) => void;
  onOpenPerks: (character: OnboardingCharacter) => void;
}

/** The expanded chapter's characters, as the same cards the Characters page shows in ownership mode. */
export function ChapterCharacterPanel({
  group,
  locale,
  backendBase,
  isCharacterOwned,
  getCharacterPerkStats,
  setCharacterOwned,
  onOpenPerks,
}: ChapterCharacterPanelProps) {
  return (
    <Surface padding="none" className={`${CHARACTER_GRID_CLASS} p-1 sm:p-2.5 md:p-3`}>
      {group.characters.map((c) => (
        <CharacterCard
          key={c.id}
          char={{
            id: c.id,
            name: c.name,
            category: c.category,
            role: c.role,
            avatar_url: c.avatar_url,
            avatar_local_path: c.avatar_local_path,
          }}
          locale={locale}
          backendBase={backendBase}
          ownershipMode
          isOwned={isCharacterOwned(c)}
          perkStats={getCharacterPerkStats(c.id, c.category)}
          onToggleOwned={(id, role) => setCharacterOwned(id, role, !isCharacterOwned(c))}
          onOpenPerks={() => onOpenPerks(c)}
          onOpenDisabled={() => undefined}
        />
      ))}
    </Surface>
  );
}
