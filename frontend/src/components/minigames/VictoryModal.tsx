// frontend/src/components/minigames/VictoryModal.tsx
'use client';

import { Button } from '@/components/common/Button';
import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Share2, Check, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';
import type { ChallengeDefinition, GuessRecord } from '@/types/minigame';
import type { Dictionary } from '@/locales/types';
import { Modal } from '@/components/common/Modal';
import { copyTextWithFallback } from '@/utils/clipboard';
import { useDictionary } from "@/context/DictionaryContext";

interface VictoryModalProps {
  challenge: ChallengeDefinition;
  roundGuesses: Record<number, GuessRecord[]>;
  roundStatus: Record<number, 'won' | 'lost' | 'in_progress'>;
  locale: string;
  onPlayAgain?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ challenge, roundGuesses, roundStatus, locale, onPlayAgain }) => {
  const dict = useDictionary();
  const [copied, setCopied] = useState(false);
  const t = dict.minigames;

  const totalRounds = challenge.rounds.length;
  const wonCount = Object.values(roundStatus).filter((s) => s === 'won').length;
  const isCompleteVictory = wonCount === totalRounds;

  useEffect(() => {
    // Launch celebratory confetti burst only on victory
    if (!isCompleteVictory) return;
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
      });
    } catch {}
  }, [isCompleteVictory]);

  // Generate shareable emoji grid string
  const generateShareText = () => {
    let text = `LemonDBD Fog Trial: ${challenge.title}\n`;
    challenge.rounds.forEach((round, idx) => {
      const guesses = roundGuesses[idx] || [];
      const count = guesses.length;
      const icons = guesses
        .slice()
        .reverse()
        .map((g) => (g.evaluation.is_correct ? '🟩' : '🟥'))
        .join('');
      text += `R${idx + 1} (${round.mode}): ${icons} (${count} attempts)\n`;
    });
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lemondbd.com';
    text += `Escaped ${wonCount}/${totalRounds} rounds! ${origin}/${locale}/minigames`;
    return text;
  };


  const handleCopy = async () => {
    const text = generateShareText();
    try {
      if (!(await copyTextWithFallback(text))) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}
  };

  return (
    <Modal
      isOpen
      onClose={() => {}}
      variant="dialog"
      size="lg"
      tone="warning"
      centerTitle
      closeButton="none"
      closeOnEscape={false}
      closeOnBackdropClick={false}
      icon={<Trophy className="h-5 w-5" aria-hidden="true" />}
      title={isCompleteVictory ? t.victoryTitle : t.defeatTitle}
      subtitle={isCompleteVictory ? t.victorySubtitle : t.defeatSubtitle}
      bodyClassName="p-5 sm:p-6"
      footerClassName="p-4 sm:px-6"
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button
              variant="primary"
              size="lg"
              onClick={handleCopy}
              className="flex-1"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{t.copiedToClipboard}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>{t.copyResults}</span>
                </>
              )}
            </Button>

            {onPlayAgain && (
              <Button
                variant="secondary"
                size="lg"
                onClick={onPlayAgain}
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t.playAgain}</span>
              </Button>
            )}

            <Link
              href={`/${locale}/minigames`}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-bg-elevated hover:bg-bg-surface border border-border-color text-text-primary type-card-title transition-all"
            >
              <Home className="w-4 h-4" />
              <span>{t.backToMinigames}</span>
            </Link>
        </div>
      }
    >
      {/* Round Performance Breakdown */}
      <div className="w-full p-4 rounded-2xl bg-bg-elevated/70 border border-border-subtle space-y-2.5">
        {challenge.rounds.map((round, idx) => {
          const guesses = roundGuesses[idx] || [];
          const isWon = roundStatus[idx] === 'won';
          return (
            <div
              key={`modal-r-${idx}`}
              className="flex items-center justify-between type-strong-fluid text-text-secondary px-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-text-muted">#{idx + 1}</span>
                <span className="truncate max-w-[160px]">
                  {(t.modes as any)[round.mode] || round.mode}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {guesses.map((g, gi) => (
                    <span
                      key={gi}
                      className={`inline-block w-2.5 h-2.5 rounded-sm ${
                        g.evaluation.is_correct ? 'bg-accent-green' : 'bg-accent-red'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-text-muted text-xs ml-1">
                  {guesses.length} {guesses.length === 1 ? t.trySingular : t.tryPlural}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};
