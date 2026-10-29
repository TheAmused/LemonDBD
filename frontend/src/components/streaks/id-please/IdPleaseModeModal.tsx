'use client';
// frontend/src/components/streaks/id-please/IdPleaseModeModal.tsx

import React from 'react';
import { TierEasyIcon, TierHellIcon, TierMediumIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import type { IdPleaseDifficulty, IdPleaseEligibility, IdPleaseLane, IdPleaseSide } from '@/types/idPleaseStreak';
import { ID_PLEASE_DIFFICULTIES, idPleaseLaneSide, parseIdPleaseDifficulty } from '@/types/idPleaseStreak';
import { ChallengeModeModal } from '../ChallengeModeModal';
import type { ChallengeIntroTile } from '../ChallengeIntroModalShell';
import { idPleaseDifficultyImage } from './idPleaseAssets';
import { idPleaseNeeds } from './idPleaseNeeds';
import { IdPleaseRulesModal } from './IdPleaseRulesModal';

const ICONS = { milestones: TierEasyIcon, hardcore: TierMediumIcon, hardcore_plus: TierHellIcon } as const;

export interface IdPleaseModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDifficulty: (difficulty: IdPleaseDifficulty) => void;
  currentDifficulty?: IdPleaseDifficulty;
  lane: IdPleaseLane;
  /** The side the artwork shows in the mixed lane (the side of the match in play); a single-side lane always shows its own. */
  side?: IdPleaseSide;
  /** Null until loaded: nothing is locked meanwhile, the server still refuses a locked start. */
  eligibility: IdPleaseEligibility | null;
  /** Difficulties whose badge this account already has. The badges are independent, nothing cascades. */
  completedVariants?: string[];
}

export const IdPleaseModeModal: React.FC<IdPleaseModeModalProps> = ({
  isOpen,
  onClose,
  onSelectDifficulty,
  currentDifficulty,
  lane,
  side,
  eligibility,
  completedVariants = [],
}) => {
  const dict = useDictionary();
  const s = dict.streaks;
  const solo = lane !== 'mixed';
  const artSide: IdPleaseSide = idPleaseLaneSide(lane) ?? side ?? 'survivor';
  const text: Record<IdPleaseDifficulty, { label: string; description: string }> = {
    milestones: { label: s.idPleaseMilestonesLabel, description: solo ? s.idPleaseMilestonesDescSolo : s.idPleaseMilestonesDesc },
    hardcore: { label: s.idPleaseHardcoreLabel, description: s.idPleaseHardcoreDesc },
    hardcore_plus: { label: s.idPleaseHardcorePlusLabel, description: s.idPleaseHardcorePlusDesc },
  };

  const tiles: ChallengeIntroTile[] = ID_PLEASE_DIFFICULTIES.map((value) => {
    const requirement = eligibility?.difficulties[value];
    const locked = requirement !== undefined && !requirement.met;
    const needs = requirement && locked ? idPleaseNeeds(s, requirement) : [];
    return {
      value,
      label: text[value].label,
      description: [text[value].description, ...needs].join(' '),
      icon: ICONS[value],
      image: idPleaseDifficultyImage(artSide, value),
      disabled: locked,
      disabledBadge: locked ? s.idPleaseLockedBadge : undefined,
      completed: completedVariants.includes(value),
    };
  });

  return (
    <ChallengeModeModal
      isOpen={isOpen}
      onClose={onClose}
      title={s.idPleaseModeSelectTitle}
      intro={solo ? s.idPleaseIntroSolo : s.idPleaseIntro}
      tiles={tiles}
      onSelectTile={(value) => onSelectDifficulty(value as IdPleaseDifficulty)}
      tileGridClassName="grid-cols-1 sm:grid-cols-3"
      selectedValue={currentDifficulty}
      renderRules={({ isOpen: rulesOpen, onClose: closeRules, value }) => (
        <IdPleaseRulesModal isOpen={rulesOpen} onClose={closeRules} lane={lane} difficulty={parseIdPleaseDifficulty(value ?? currentDifficulty)} />
      )}
    />
  );
};
