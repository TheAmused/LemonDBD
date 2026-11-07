'use client';
// frontend/src/components/streaks/id-please/IdPleaseRulesModal.tsx

import React from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import type { IdPleaseDifficulty, IdPleaseLane } from '@/types/idPleaseStreak';
import { RulesModalShell } from '../RulesModalShell';
import {
  DIFFICULTY_TEXT,
  RulesDifficultyRows,
  RulesHowItWorks,
  RulesModalFooterSections,
  RulesSection,
  BOTH_SIDES_CLARIFICATIONS,
  STANDARD_CLARIFICATIONS_WITH_ADDONS,
  STANDARD_EXCEPTIONS,
  SURVIVOR_CLARIFICATIONS,
  SURVIVOR_EXCEPTIONS,
  resolveRuleEntries,
} from '../RulesModalSections';
import { ID_PLEASE_DIFFICULTY_TONE } from './idPleaseAssets';

export interface IdPleaseRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The lane the rules are about: the combined tab alternates sides, the others stay on one. */
  lane: IdPleaseLane;
  /** The difficulty in play, or the one highlighted in the picker: only the chain rule differs between them. */
  difficulty: IdPleaseDifficulty;
}

/**
 * The same rules as every other challenge's modal: how it works, the difficulties side by side, exceptions and
 * clarifications. The chain arithmetic itself is not spelled out: the rules only say what it depends on.
 */
export const IdPleaseRulesModal: React.FC<IdPleaseRulesModalProps> = ({ isOpen, onClose, lane, difficulty }) => {
  const dict = useDictionary();
  const s = dict.streaks;
  const solo = lane !== 'mixed';
  // Hardcore+ reshuffles the perks at every start, so "the same start gives the same chain" does not hold there.
  const plus = difficulty === 'hardcore_plus';
  // The win condition is the one the other challenges use, for the side(s) this lane plays.
  // The same exceptions and clarifications the Gauntlet shows for the side(s) this lane plays.
  const exceptions = lane === 'killer' ? STANDARD_EXCEPTIONS : SURVIVOR_EXCEPTIONS;
  const clarifications = { killer: STANDARD_CLARIFICATIONS_WITH_ADDONS, survivor: SURVIVOR_CLARIFICATIONS, mixed: BOTH_SIDES_CLARIFICATIONS }[lane];
  const winCondition = lane === 'killer' ? s.gauntletWinConditionKiller : lane === 'survivor' ? s.gauntletWinConditionSurvivor : s.idPleaseWinMixed;

  return (
    <RulesModalShell isOpen={isOpen} onClose={onClose} title={s.rules}>
      <RulesHowItWorks
        tone="neutral"
        title={s.howItWorks}
        items={[
          winCondition,
          solo ? s.idPleaseRuleOpeningSolo : s.idPleaseRuleOpening,
          s.idPleaseRulePlay,
          plus ? s.idPleaseRuleChainPlus : s.idPleaseRuleChain,
          s.idPleaseRuleLive,
          s.idPleaseRuleEndless,
        ]}
      />

      <RulesSection title={s.difficultyAndCheckpoints}>
        <RulesDifficultyRows
          rows={[
            {
              label: s.idPleaseMilestonesLabel,
              text: solo ? s.idPleaseRuleMilestonesSolo : s.idPleaseRuleMilestones,
              labelClassName: DIFFICULTY_TEXT[ID_PLEASE_DIFFICULTY_TONE.milestones],
            },
            {
              label: s.idPleaseHardcoreLabel,
              text: s.idPleaseRuleHardcore,
              labelClassName: DIFFICULTY_TEXT[ID_PLEASE_DIFFICULTY_TONE.hardcore],
            },
            {
              label: s.idPleaseHardcorePlusLabel,
              text: s.idPleaseRuleHardcorePlus,
              labelClassName: DIFFICULTY_TEXT[ID_PLEASE_DIFFICULTY_TONE.hardcore_plus],
            },
          ]}
        />
      </RulesSection>

      <RulesModalFooterSections
        copy={s}
        tone="neutral"
        showFreezeNotice={false}
        exceptions={resolveRuleEntries(s, exceptions)}
        clarifications={resolveRuleEntries(s, clarifications)}
      />
    </RulesModalShell>
  );
};
