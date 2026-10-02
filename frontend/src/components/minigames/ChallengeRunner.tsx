// frontend/src/components/minigames/ChallengeRunner.tsx
'use client';

import { Button } from '@/components/common/Button';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trophy,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  EyeOff,
  Flame,
} from 'lucide-react';
import type {
  ChallengeDefinition,
  MinigameCatalog,
  GuessRecord,
  RoundConfig,
  TargetType,
} from '@/types/minigame';
import type { Dictionary } from '@/locales/types';
import { submitGuess } from '@/services/minigameApi';
import { soundEngine } from '@/utils/minigames/MinigameSoundEngine';
import {
  getChallengeProgress,
  saveChallengeProgress,
  recordDailyCompletion,
  recordDailyLoss,
} from '@/utils/minigames/storage';


import { CharacterAutocomplete, type AutocompleteItem } from './CharacterAutocomplete';
import { ClassicCharacterGuesser } from './guessers/ClassicCharacterGuesser';
import { ClassicPerkGuesser } from './guessers/ClassicPerkGuesser';
import { RealmGuesser } from './guessers/RealmGuesser';
import { PixelAvatarGuesser } from './guessers/PixelAvatarGuesser';
import { PerkIconGuesser } from './guessers/PerkIconGuesser';
import { KillerPowerGuesser } from './guessers/KillerPowerGuesser';
import { AudioGuesser } from './guessers/AudioGuesser';
import { QuoteLoreGuesser } from './guessers/QuoteLoreGuesser';
import { EmojiRiddleGuesser } from './guessers/EmojiRiddleGuesser';
import { AddonGuesser } from './guessers/AddonGuesser';
import { VictoryModal } from './VictoryModal';

interface ChallengeRunnerProps {
  challenge: ChallengeDefinition;
  catalog: MinigameCatalog;
  dict: Dictionary;
  locale: string;
}

export const ChallengeRunner: React.FC<ChallengeRunnerProps> = ({
  challenge,
  catalog,
  dict,
  locale,
}) => {
  const t = dict.minigames;
  const challengeId = challenge.id || 'default_trial';

  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [roundGuesses, setRoundGuesses] = useState<Record<number, GuessRecord[]>>({});
  const [roundStatus, setRoundStatus] = useState<Record<number, 'in_progress' | 'won' | 'lost'>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, string>>({});

  // Restore saved progress on mount
  useEffect(() => {
    const saved = getChallengeProgress(challengeId);
    if (saved) {
      setCurrentRoundIndex(saved.currentRoundIndex || 0);
      setRoundGuesses(saved.roundGuesses || {});
      setRoundStatus(saved.roundStatus || {});
      setIsFinished(saved.isFinished || false);
    }
  }, [challengeId]);

  const rounds = challenge.rounds;
  const currentRound: RoundConfig = rounds[currentRoundIndex] || rounds[0];
  const currentGuesses = roundGuesses[currentRoundIndex] || [];
  const status = roundStatus[currentRoundIndex] || 'in_progress';
  const isRoundSolved = status === 'won';
  const isRoundOver = status === 'won' || status === 'lost';
  const maxAttempts = currentRound.max_attempts || 6;
  const attemptsRemaining = Math.max(0, maxAttempts - currentGuesses.length);

  // Target type determination for autocomplete
  const activeTargetType = useMemo<TargetType>(() => {
    const mode = currentRound.mode;
    if (mode === 'realm_guesser' || (mode as string) === 'realm') return 'realm';
    if (
      mode === 'classic_perk' ||
      mode === 'perk_icon' ||
      mode === 'perk_distortion' ||
      (mode as string) === 'perk'
    )
      return 'perk';
    if (
      mode === 'classic_killer' ||
      mode === 'killer_power' ||
      (mode as string) === 'power' ||
      mode === 'terror_radius' ||
      (mode as string) === 'audio'
    )
      return 'killer';
    if (mode === 'quote_lore' || (mode as string) === 'quote') {
      return (currentRound.target_type as TargetType) || 'character';
    }
    if (
      mode === 'classic_character' ||
      mode === 'classic' ||
      mode === 'pixel_avatar' ||
      (mode as string) === 'pixel' ||
      mode === 'voice_line' ||
      mode === 'hook_scream' ||
      mode === 'emoji_riddle'
    ) {
      return 'character';
    }
    return (currentRound.target_type as TargetType) || 'character';
  }, [currentRound]);

  // Excluded keys (already guessed in current round, scoped by role:id to avoid collisions)
  const excludeKeys = useMemo(() => {
    return currentGuesses.map(
      (g) => `${(g.guess.role || '').toLowerCase()}:${g.guess.id}`
    );
  }, [currentGuesses]);

  // Persist state updates
  const persistState = useCallback(
    (
      newIndex: number,
      newGuesses: Record<number, GuessRecord[]>,
      newStatus: Record<number, 'in_progress' | 'won' | 'lost'>,
      finished: boolean
    ) => {
      saveChallengeProgress({
        challengeId,
        currentRoundIndex: newIndex,
        roundGuesses: newGuesses,
        roundStatus: newStatus,
        isFinished: finished,
        won: Object.values(newStatus).every((s) => s === 'won'),
        startedAt: Date.now(),
      });
    },
    [challengeId]
  );

  const getTargetAnswerName = useCallback(
    (round: RoundConfig): string => {
      const mode = round.mode;
      const tId = round.target_id;
      if (!tId) return 'Unknown';

      if (mode === 'realm_guesser' || round.target_type === 'realm') {
        const found = (catalog.realms || []).find((r) => r.id === tId);
        return found ? found.name : `Realm #${tId}`;
      }

      if (
        mode === 'classic_perk' ||
        mode === 'perk_icon' ||
        mode === 'perk_distortion' ||
        round.target_type === 'perk'
      ) {
        const found = (catalog.perks || []).find((p) => p.id === tId);
        return found ? found.name : `Perk #${tId}`;
      }

      // Characters
      const allChars = (catalog.killers || []).concat(catalog.survivors || []);
      const match =
        allChars.find(
          (c) =>
            c.id === tId &&
            (!round.target_type || c.role?.toLowerCase() === round.target_type?.toLowerCase())
        ) || allChars.find((c) => c.id === tId);

      return match ? match.name : `Character #${tId}`;
    },
    [catalog]
  );

  const handleSelectGuess = async (item: AutocompleteItem) => {
    if (isRoundOver || isSubmitting) return;

    const guessType =
      activeTargetType === 'perk'
        ? 'perk'
        : activeTargetType === 'realm'
        ? 'realm'
        : item.role
        ? item.role.toLowerCase()
        : 'killer';

    setIsSubmitting(true);
    try {
      const result = await submitGuess({
        challenge_id: challenge.id,
        round_index: currentRoundIndex,
        guess_id: item.id,
        guess_type: guessType,
        guess_name: item.name,
        custom_round_config: currentRound,
        attempt_number: currentGuesses.length + 1,
      });

      const newRecord: GuessRecord = {
        guess: item,
        evaluation: result,
      };

      const updatedGuesses = {
        ...roundGuesses,
        [currentRoundIndex]: [newRecord, ...currentGuesses],
      };

      const isCorrect = result.is_correct;
      const isExhausted = !isCorrect && currentGuesses.length + 1 >= maxAttempts;

      if (isExhausted) {
        const ans = getTargetAnswerName(currentRound);
        setRevealedAnswers((prev) => ({ ...prev, [currentRoundIndex]: ans }));
      }

      const newRoundStatus = {
        ...roundStatus,
        [currentRoundIndex]: isCorrect ? 'won' : isExhausted ? 'lost' : 'in_progress',
      } as Record<number, 'in_progress' | 'won' | 'lost'>;

      setRoundGuesses(updatedGuesses);
      setRoundStatus(newRoundStatus);

      if (isCorrect) {
        soundEngine.playFeedback('correct');
      } else {
        soundEngine.playFeedback('incorrect');
      }

      // Check if this was the last round
      if ((isCorrect || isExhausted) && currentRoundIndex === rounds.length - 1) {
        setIsFinished(true);
        if (challenge.challenge_date) {
          const allWon = Object.values(newRoundStatus).every((s) => s === 'won');
          if (allWon) {
            recordDailyCompletion(challenge.challenge_date);
          } else {
            recordDailyLoss(challenge.challenge_date);
          }
        }
        persistState(currentRoundIndex, updatedGuesses, newRoundStatus, true);
      } else {
        persistState(currentRoundIndex, updatedGuesses, newRoundStatus, false);
      }
    } catch (err) {
      console.error('Error evaluating guess:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGiveUp = () => {
    if (isRoundOver) return;

    const ans = getTargetAnswerName(currentRound);
    setRevealedAnswers((prev) => ({ ...prev, [currentRoundIndex]: ans }));

    const newRoundStatus = {
      ...roundStatus,
      [currentRoundIndex]: 'lost' as const,
    };
    setRoundStatus(newRoundStatus);

    if (challenge.challenge_date) {
      recordDailyLoss(challenge.challenge_date);
    }

    if (currentRoundIndex === rounds.length - 1) {
      setIsFinished(true);
      persistState(currentRoundIndex, roundGuesses, newRoundStatus, true);
    } else {
      persistState(currentRoundIndex, roundGuesses, newRoundStatus, false);
    }
  };


  const handleNextRound = () => {
    if (currentRoundIndex < rounds.length - 1) {
      const nextIdx = currentRoundIndex + 1;
      setCurrentRoundIndex(nextIdx);
      persistState(nextIdx, roundGuesses, roundStatus, false);
    } else {
      setIsFinished(true);
      persistState(currentRoundIndex, roundGuesses, roundStatus, true);
    }
  };

  const renderActiveGuesser = (inputSlot: React.ReactNode) => {
    const mode = currentRound.mode;

    switch (mode as string) {
      case 'realm_guesser':
      case 'realm':
        return (
          <RealmGuesser
            roundConfig={currentRound}
            realms={catalog.realms || []}
            guesses={currentGuesses}
            isSolved={isRoundSolved}
            dict={dict}
          >
            {inputSlot}
          </RealmGuesser>
        );
      case 'pixel_avatar':
      case 'pixel':
        return (
          <PixelAvatarGuesser
            roundConfig={currentRound}
            characters={catalog.killers.concat(catalog.survivors)}
            guesses={currentGuesses}
            isSolved={isRoundSolved}
            dict={dict}
          >
            {inputSlot}
          </PixelAvatarGuesser>
        );
      case 'perk_icon':
      case 'perk_distortion':
      case 'perk':
        return (
          <PerkIconGuesser
            roundConfig={currentRound}
            perks={catalog.perks || []}
            guesses={currentGuesses}
            isSolved={isRoundSolved}
            dict={dict}
          >
            {inputSlot}
          </PerkIconGuesser>
        );
      case 'killer_power':
      case 'power':
        return (
          <KillerPowerGuesser
            roundConfig={currentRound}
            killers={catalog.killers || []}
            guesses={currentGuesses}
            isSolved={isRoundSolved}
            dict={dict}
          >
            {inputSlot}
          </KillerPowerGuesser>
        );
      case 'voice_line':
      case 'hook_scream':
      case 'terror_radius':
      case 'audio':
        return (
          <AudioGuesser
            roundConfig={currentRound}
            characters={catalog.killers.concat(catalog.survivors)}
            guesses={currentGuesses}
            isSolved={isRoundSolved}
            dict={dict}
          >
            {inputSlot}
          </AudioGuesser>
        );
      case 'quote_lore':
      case 'quote':
        return (
          <QuoteLoreGuesser
            roundConfig={currentRound}
            characters={catalog.killers.concat(catalog.survivors)}
            perks={catalog.perks || []}
            guesses={currentGuesses}
            isSolved={isRoundSolved}
            dict={dict}
          >
            {inputSlot}
          </QuoteLoreGuesser>
        );
      case 'emoji_riddle':
        return (
          <EmojiRiddleGuesser
            roundConfig={currentRound}
            characters={catalog.killers.concat(catalog.survivors)}
            perks={catalog.perks || []}
            guesses={currentGuesses}
            isSolved={isRoundSolved}
            dict={dict}
          >
            {inputSlot}
          </EmojiRiddleGuesser>
        );
      case 'addon_guesser':
        return (
          <AddonGuesser
            roundConfig={currentRound}
            killers={catalog.killers || []}
            guesses={currentGuesses}
            isSolved={isRoundSolved}
            dict={dict}
          >
            {inputSlot}
          </AddonGuesser>
        );
      case 'classic_perk':
        return (
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-xl my-3">{inputSlot}</div>
            <ClassicPerkGuesser guesses={currentGuesses} dict={dict} />
          </div>
        );
      case 'classic_killer':
      case 'classic_character':
      case 'classic':
      default:
        return (
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-xl my-3">{inputSlot}</div>
            <ClassicCharacterGuesser guesses={currentGuesses} dict={dict} />
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 flex flex-col items-center">
      {/* Trial Header */}
      <div className="w-full text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
          {challenge.title}
        </h1>
        {challenge.description && (
          <p className="text-sm text-text-secondary mt-1 max-w-lg mx-auto">
            {challenge.description}
          </p>
        )}
      </div>

      {/* Multi-Round Progress Pills Bar */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto max-w-full py-1 px-2">
        {rounds.map((r, idx) => {
          const rStat = roundStatus[idx];
          const isCurrent = idx === currentRoundIndex;
          const isWon = rStat === 'won';
          const isLost = rStat === 'lost';

          return (
            <button
              key={`round-pill-${idx}`}
              type="button"
              onClick={() => {
                // Allow revisiting any round that is completed or active
                if (idx <= currentRoundIndex || rStat) {
                  setCurrentRoundIndex(idx);
                }
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                isCurrent
                  ? 'bg-accent-red text-text-inverted border-accent-red shadow-lg shadow-accent-red/20 scale-105'
                  : isWon
                  ? 'bg-accent-green/20 text-accent-green border-accent-green/40 hover:bg-accent-green/30'
                  : isLost
                  ? 'bg-accent-red/20 text-accent-red border-accent-red/40 hover:bg-accent-red/30'
                  : 'bg-bg-surface text-text-secondary border-border-color hover:text-text-primary'
              }`}
            >
              {isWon ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />
              ) : isLost ? (
                <XCircle className="w-3.5 h-3.5 text-accent-red" />
              ) : (
                <span>R{idx + 1}</span>
              )}
              <span className="truncate max-w-[100px]">
                {(t.modes as any)[r.mode] || r.mode}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Round Card Banner */}
      <div className="w-full max-w-xl text-center mb-4">
        <div className="type-label-sm text-text-secondary mb-1">
          {t.roundIndicator
            .replace('{current}', String(currentRoundIndex + 1))
            .replace('{total}', String(rounds.length))}
        </div>
        <h2 className="text-xl font-bold text-text-primary">
          {(t.modes as any)[currentRound.mode] || currentRound.mode}
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          {(t.modeDescriptions as any)[currentRound.mode] || ''}
        </p>
      </div>

      {/* Attempts Remaining Counter */}
      <div className="mb-4 type-strong text-text-secondary flex items-center gap-1.5">
        <Flame className="w-4 h-4 text-accent-red" />
        <span>
          {attemptsRemaining > 0
            ? t.attemptsRemaining.replace('{count}', String(attemptsRemaining))
            : t.unlimitedAttempts}
        </span>
      </div>

      {/* Interactive Mode Guesser with embedded Input & Actions */}
      {renderActiveGuesser(
        <div className="w-full flex flex-col items-center">
          {!isRoundOver ? (
            <div className="w-full max-w-xl mb-2">
              <CharacterAutocomplete
                catalog={catalog}
                targetType={activeTargetType}
                onSelect={handleSelectGuess}
                disabled={isSubmitting}
                placeholder={t.guessPlaceholder}
                excludeKeys={excludeKeys}
                autoFocus={false}
              />
            </div>
          ) : (
            <div className="w-full max-w-xl flex flex-col items-center gap-3 my-2">
              <div
                className={`w-full py-3 px-4 rounded-xl text-center font-bold text-sm border shadow-lg ${
                  isRoundSolved
                    ? 'bg-accent-green/20 text-accent-green border-accent-green/40'
                    : 'bg-accent-red/20 text-accent-red border-accent-red/40'
                }`}
              >
                <div>{isRoundSolved ? t.victoryTitle : t.defeatTitle}</div>
                {!isRoundSolved && (
                  <div className="type-strong text-accent-red mt-1">
                    {t.revealAnswerNotice.replace(
                      '{answer}',
                      revealedAnswers[currentRoundIndex] || getTargetAnswerName(currentRound)
                    )}
                  </div>
                )}
              </div>

              {currentRoundIndex < rounds.length - 1 ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleNextRound}
                >
                  <span>{t.nextRound}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="success"
                  size="lg"
                  onClick={() => setIsFinished(true)}
                >
                  <Trophy className="w-4 h-4" />
                  <span>{t.finishTrial}</span>
                </Button>
              )}
            </div>
          )}

          {/* Give up button (when in progress) */}
          {!isRoundOver && (
            <button
              type="button"
              onClick={handleGiveUp}
              className="text-xs text-text-muted hover:text-text-primary underline py-1 transition-colors"
            >
              {t.skipOrReveal}
            </button>
          )}
        </div>
      )}

      {/* Victory Celebration Modal */}
      {isFinished && (
        <VictoryModal
          challenge={challenge}
          roundGuesses={roundGuesses}
          roundStatus={roundStatus}
          locale={locale}
          dict={dict}
        />
      )}
    </div>
  );
};
