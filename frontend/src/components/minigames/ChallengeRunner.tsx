// frontend/src/components/minigames/ChallengeRunner.tsx
'use client';

import { logger } from '@/utils/logger';
import { lookup } from '@/utils/lookup';
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
  ChallengeSource,
  MinigameCatalog,
  GuessRecord,
  RoundConfig,
  TargetType,
} from '@/types/minigame';
import { submitGuess } from '@/services/minigameApi';
import { answerName, guessTargetType, type RevealedAnswer } from '@/utils/minigames/roundAnswers';
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
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";
import { TileButton } from "@/components/common/TileButton";

interface ChallengeRunnerProps {
  challenge: ChallengeDefinition;
  catalog: MinigameCatalog;
  locale: string;
  /**
   * Official (daily/repeatable) guesses are graded by the server against the round it stored, and
   * the answer only comes back once the round is over. A custom trial exists only in this browser,
   * so its round travels with each guess.
   */
  source: ChallengeSource;
}

export const ChallengeRunner: React.FC<ChallengeRunnerProps> = ({ challenge, catalog, locale, source }) => {
  const dict = useDictionary();
  const t = dict.minigames;
  const challengeId = challenge.id || 'default_trial';

  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [roundGuesses, setRoundGuesses] = useState<Record<number, GuessRecord[]>>({});
  const [roundStatus, setRoundStatus] = useState<Record<number, 'in_progress' | 'won' | 'lost'>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, RevealedAnswer>>({});
  const [guessError, setGuessError] = useState<boolean>(false);

  // Restore saved progress on mount
  useEffect(() => {
    const saved = getChallengeProgress(challengeId);
    if (saved) {
      setCurrentRoundIndex(saved.currentRoundIndex || 0);
      setRoundGuesses(saved.roundGuesses || {});
      setRoundStatus(saved.roundStatus || {});
      setIsFinished(saved.isFinished || false);
      setRevealedAnswers(saved.revealedAnswers || {});
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
  const activeTargetType = useMemo<TargetType>(() => guessTargetType(currentRound), [currentRound]);

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
      finished: boolean,
      answers: Record<number, RevealedAnswer> = revealedAnswers
    ) => {
      saveChallengeProgress({
        challengeId,
        currentRoundIndex: newIndex,
        roundGuesses: newGuesses,
        roundStatus: newStatus,
        isFinished: finished,
        won: Object.values(newStatus).every((s) => s === 'won'),
        startedAt: Date.now(),
        revealedAnswers: answers,
      });
    },
    [challengeId, revealedAnswers]
  );

  const getTargetAnswerName = useCallback(
    (round: RoundConfig, revealed?: RevealedAnswer): string => answerName(round, catalog, t, revealed),
    [catalog, t]
  );

  /** The guess request for the current round: official rounds are graded by id, custom ones carry the round. */
  const guessRequest = useCallback(
    () => ({
      challenge_id: challenge.id,
      challenge_type: source,
      round_index: currentRoundIndex,
      ...(source === 'custom' ? { custom_round_config: currentRound } : {}),
    }),
    [challenge.id, source, currentRoundIndex, currentRound]
  );

  /** A daily's streak is settled once, when its last round is over: won only if every round was. */
  const settleDaily = useCallback(
    (statuses: Record<number, 'in_progress' | 'won' | 'lost'>) => {
      if (!challenge.challenge_date || source !== 'daily') return;
      const allWon = rounds.every((_, idx) => statuses[idx] === 'won');
      if (allWon) recordDailyCompletion(challenge.challenge_date);
      else recordDailyLoss(challenge.challenge_date);
    },
    [challenge.challenge_date, source, rounds]
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
    setGuessError(false);
    try {
      const result = await submitGuess({
        ...guessRequest(),
        guess_id: item.id,
        guess_type: guessType,
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

      const updatedAnswers = result.answer
        ? { ...revealedAnswers, [currentRoundIndex]: result.answer }
        : revealedAnswers;
      if (result.answer) setRevealedAnswers(updatedAnswers);

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
        settleDaily(newRoundStatus);
        persistState(currentRoundIndex, updatedGuesses, newRoundStatus, true, updatedAnswers);
      } else {
        persistState(currentRoundIndex, updatedGuesses, newRoundStatus, false, updatedAnswers);
      }
    } catch (err) {
      logger.error('Error evaluating guess:', err);
      setGuessError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGiveUp = async () => {
    if (isRoundOver || isSubmitting) return;

    // An official round's answer is only on the server; a custom round carries its own.
    let answer: RevealedAnswer = { target_type: currentRound.target_type, target_id: currentRound.target_id };
    if (source !== 'custom') {
      setIsSubmitting(true);
      try {
        const result = await submitGuess({ ...guessRequest(), give_up: true });
        if (result.answer) answer = result.answer;
      } catch (err) {
        logger.error('Error giving up the round:', err);
        setGuessError(true);
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
    }

    const updatedAnswers = { ...revealedAnswers, [currentRoundIndex]: answer };
    setRevealedAnswers(updatedAnswers);

    const newRoundStatus = {
      ...roundStatus,
      [currentRoundIndex]: 'lost' as const,
    };
    setRoundStatus(newRoundStatus);

    if (currentRoundIndex === rounds.length - 1) {
      setIsFinished(true);
      settleDaily(newRoundStatus);
      persistState(currentRoundIndex, roundGuesses, newRoundStatus, true, updatedAnswers);
    } else {
      persistState(currentRoundIndex, roundGuesses, newRoundStatus, false, updatedAnswers);
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
          >
            {inputSlot}
          </AddonGuesser>
        );
      case 'classic_perk':
        return (
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-xl my-3">{inputSlot}</div>
            <ClassicPerkGuesser guesses={currentGuesses} />
          </div>
        );
      case 'classic_killer':
      case 'classic_character':
      case 'classic':
      default:
        return (
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-xl my-3">{inputSlot}</div>
            <ClassicCharacterGuesser guesses={currentGuesses} />
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
            <TileButton
              key={`round-pill-${idx}`}
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
              }`} press={false}
            >
              {isWon ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />
              ) : isLost ? (
                <XCircle className="w-3.5 h-3.5 text-accent-red" />
              ) : (
                <span>R{idx + 1}</span>
              )}
              <span className="truncate max-w-25">
                {lookup<string>(t.modes, r.mode) || r.mode}
              </span>
            </TileButton>
          );
        })}
      </div>

      {/* Active Round Card Banner */}
      <div className="w-full max-w-xl text-center mb-4">
        <div className="type-label-sm text-text-secondary mb-1">
          {formatMessage(t.roundIndicator, { current: currentRoundIndex + 1, total: rounds.length })}
        </div>
        <h2 className="text-xl font-bold text-text-primary">
          {lookup<string>(t.modes, currentRound.mode) || currentRound.mode}
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          {lookup<string>(t.modeDescriptions, currentRound.mode) || ''}
        </p>
      </div>

      {/* Attempts Remaining Counter */}
      <div className="mb-4 type-strong text-text-secondary flex items-center gap-1.5">
        <Flame className="w-4 h-4 text-accent-red" />
        <span>
          {attemptsRemaining > 0
            ? formatMessage(t.attemptsRemaining, { count: attemptsRemaining }, locale)
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
                className={`w-full py-3 px-4 rounded-card text-center font-bold text-sm border shadow-lg ${
                  isRoundSolved
                    ? 'bg-accent-green/20 text-accent-green border-accent-green/40'
                    : 'bg-accent-red/20 text-accent-red border-accent-red/40'
                }`}
              >
                <div>{isRoundSolved ? t.victoryTitle : t.defeatTitle}</div>
                {!isRoundSolved && (
                  <div className="type-strong text-accent-red mt-1">
                    {formatMessage(t.revealAnswerNotice, { answer: getTargetAnswerName(currentRound, revealedAnswers[currentRoundIndex]) })}
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

          {guessError && (
            <p role="alert" className="type-strong text-accent-red text-center mb-2">
              {t.guessFailed}
            </p>
          )}

          {/* Give up button (when in progress) */}
          {!isRoundOver && (
            <Button
              type="button"
              onClick={() => void handleGiveUp()}
              disabled={isSubmitting}
              variant="linkMuted" size="sm"
            >
              {t.skipOrReveal}
            </Button>
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
        />
      )}
    </div>
  );
};
