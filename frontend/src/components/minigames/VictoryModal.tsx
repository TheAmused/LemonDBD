// frontend/src/components/minigames/VictoryModal.tsx
'use client';

import { lookup } from '@/utils/lookup';
import { Button, buttonClassName } from '@/components/common/Button';
import React, { useEffect, useState } from 'react';
import { Share2, Check, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';
import type { ChallengeDefinition, GuessRecord } from '@/types/minigame';
import { Modal } from '@/components/common/Modal';
import { copyTextWithFallback } from '@/utils/clipboard';
import { useDictionary } from "@/context/DictionaryContext";
import { formatMessage } from '@/utils/i18nFormat';
import { Surface } from '@/components/common/Surface';
import { paletteColor } from '@/utils/themeColor';

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
    // Loaded on the win only: the library is the heaviest part of this screen and most rounds never reach it.
    import('canvas-confetti')
      .then(({ default: confetti }) =>
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: [paletteColor('red-500'), paletteColor('amber-500'), paletteColor('emerald-500'), paletteColor('blue-500'), paletteColor('violet-500')],
        })
      )
      .catch(() => undefined);
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
      closeButton="none"
      closeOnEscape={false}
      closeOnBackdropClick={false}
      title={isCompleteVictory ? t.victoryTitle : t.defeatTitle}
      bodyClassName="p-5 sm:p-6"
      footerClassName="p-4 sm:px-6"
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button
              variant="primary"
              size="lg"
              onClick={() => { void handleCopy(); }}
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
              className={buttonClassName('secondary', 'md', 'w-full')}
            >
              <Home className="w-4 h-4" />
              <span>{t.backToMinigames}</span>
            </Link>
        </div>
      }
    >
      {/* Round Performance Breakdown */}
      <Surface tone="elevated" padding="none" className="w-full p-4 bg-bg-elevated/70 border-border-subtle space-y-2.5">
        {challenge.rounds.map((round, idx) => {
          const guesses = roundGuesses[idx] || [];
          return (
            <div
              key={`modal-r-${idx}`}
              className="flex items-center justify-between type-strong-fluid text-text-secondary px-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-text-muted">#{idx + 1}</span>
                <span className="truncate max-w-40">
                  {lookup<string>(t.modes, round.mode) || round.mode}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {guesses.map((g, gi) => (
                    <span
                      key={gi}
                      className={`inline-block w-2.5 h-2.5 rounded-chip ${
                        g.evaluation.is_correct ? 'bg-accent-green' : 'bg-accent-red'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-text-muted text-xs ml-1">
                  {formatMessage(t.triesCount, { count: guesses.length }, locale)}
                </span>
              </div>
            </div>
          );
        })}
      </Surface>
    </Modal>
  );
};
