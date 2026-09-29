// frontend/src/components/minigames/VictoryModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Share2, Check, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';
import type { ChallengeDefinition, GuessRecord } from '@/types/minigame';
import type { Dictionary } from '@/locales/types';

interface VictoryModalProps {
  challenge: ChallengeDefinition;
  roundGuesses: Record<number, GuessRecord[]>;
  roundStatus: Record<number, 'won' | 'lost' | 'in_progress'>;
  locale: string;
  dict: Dictionary;
  onPlayAgain?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  challenge,
  roundGuesses,
  roundStatus,
  locale,
  dict,
  onPlayAgain,
}) => {
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
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-zinc-700/80 shadow-2xl flex flex-col items-center text-center">
        {/* Trophy icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
          <Trophy className="w-8 h-8 animate-pulse" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
          {isCompleteVictory ? t.victoryTitle : t.defeatTitle}
        </h2>
        <p className="text-sm text-zinc-400 mt-2 max-w-sm">
          {isCompleteVictory ? t.victorySubtitle : t.defeatSubtitle}
        </p>

        {/* Round Performance Breakdown */}
        <div className="w-full my-6 p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2.5">
          {challenge.rounds.map((round, idx) => {
            const guesses = roundGuesses[idx] || [];
            const isWon = roundStatus[idx] === 'won';
            return (
              <div
                key={`modal-r-${idx}`}
                className="flex items-center justify-between text-xs sm:text-sm font-semibold text-zinc-300 px-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">#{idx + 1}</span>
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
                          g.evaluation.is_correct ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-zinc-400 text-xs ml-1">
                    {guesses.length} {guesses.length === 1 ? 'try' : 'tries'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent-red hover:bg-accent-red/90 text-white font-bold text-sm shadow-lg shadow-accent-red/25 transition-all active:scale-95"
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
          </button>

          {onPlayAgain && (
            <button
              type="button"
              onClick={onPlayAgain}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-semibold text-sm transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.playAgain}</span>
            </button>
          )}

          <Link
            href={`/${locale}/minigames`}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-semibold text-sm transition-all"
          >
            <Home className="w-4 h-4" />
            <span>{t.backToMinigames}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
