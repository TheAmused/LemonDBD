// frontend/src/components/smash-or-pass/TactileKeycaps.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, RotateCcw, Heart, ThumbsDown, Zap, FileText } from 'lucide-react';

export interface TactileKeycapsProps {
  onPass?: () => void;
  onSmash?: () => void;
  onSuperSmash?: () => void;
  onStats?: () => void;
  onReset?: () => void;
  onVote?: (vote: 'smash' | 'pass' | 'super_smash') => void;
  dict?: any;
  disabled?: boolean;
  activeKey?: string | null;
  className?: string;
  compact?: boolean;
  showHints?: boolean;
}

type KeyAction = 'pass' | 'smash' | 'stats' | 'super_smash' | 'reset';

interface KeycapConfig {
  id: KeyAction;
  keys: string[]; // key event strings (e.g. 'ArrowLeft', 'a', 'A')
  symbol: string;
  subLegend: string;
  label: string;
  icon: React.ReactNode;
  theme: {
    baseBorder: string;
    baseText: string;
    activeGlow: string;
    activeBorder: string;
    activeBg: string;
    activeShadow: string;
    accentColor: string;
  };
}

export const TactileKeycaps: React.FC<TactileKeycapsProps> = ({
  onPass,
  onSmash,
  onSuperSmash,
  onStats,
  onReset,
  onVote,
  dict,
  disabled = false,
  activeKey = null,
  className = '',
  compact = false,
  showHints = true,
}) => {
  const [pressedSet, setPressedSet] = useState<Set<KeyAction>>(new Set());

  // Localization
  const passLabel = dict?.smashOrPass?.controls?.pass || dict?.smashOrPass?.pass || 'Pass';
  const smashLabel = dict?.smashOrPass?.controls?.smash || dict?.smashOrPass?.smash || 'Smash';
  const superSmashLabel =
    dict?.smashOrPass?.controls?.superSmash || dict?.smashOrPass?.superSmash || 'Super Smash';
  const statsLabel =
    dict?.smashOrPass?.controls?.stats || dict?.smashOrPass?.stats || 'Dossier / Stats';
  const resetLabel =
    dict?.smashOrPass?.controls?.reset || dict?.smashOrPass?.reset || 'Reset Deck';
  const hintLabel =
    dict?.smashOrPass?.controls?.hint || 'Tactile Keyboard Shortcuts & Controls';

  // Key configurations with specific neon glow themes:
  // ← Left Arrow: Pass (Void Cyan glow #00f5d4)
  // → Right Arrow: Smash (Neon Crimson glow #ff0055)
  // ↑ Up Arrow: Dossier / Stats (Cyber Mint glow #00f5d4)
  // ↓ Down Arrow: Super Smash / Chaos (Eldritch Gold glow #ffd166)
  // R Key: Reset Deck (Deep Velvet Purple glow #2e0854 / #a855f7)
  const keycaps: KeycapConfig[] = [
    {
      id: 'pass',
      keys: ['ArrowLeft', 'a', 'A'],
      symbol: '←',
      subLegend: 'A',
      label: passLabel,
      icon: <ThumbsDown className="h-3.5 w-3.5" />,
      theme: {
        baseBorder: 'border-cyan-500/30 hover:border-cyan-400/60',
        baseText: 'text-cyan-300',
        activeGlow: 'shadow-[0_0_25px_rgba(0,245,212,0.8),inset_0_0_12px_rgba(0,245,212,0.4)]',
        activeBorder: 'border-[#00f5d4]',
        activeBg: 'bg-[#00f5d4]/20',
        activeShadow: 'shadow-[0_1px_0_0_#0e7490]',
        accentColor: '#00f5d4',
      },
    },
    {
      id: 'stats',
      keys: ['ArrowUp', 'w', 'W'],
      symbol: '↑',
      subLegend: 'W',
      label: statsLabel,
      icon: <FileText className="h-3.5 w-3.5" />,
      theme: {
        baseBorder: 'border-emerald-500/30 hover:border-emerald-400/60',
        baseText: 'text-emerald-300',
        activeGlow: 'shadow-[0_0_25px_rgba(0,245,212,0.8),inset_0_0_12px_rgba(0,245,212,0.4)]',
        activeBorder: 'border-[#00f5d4]',
        activeBg: 'bg-[#00f5d4]/20',
        activeShadow: 'shadow-[0_1px_0_0_#047857]',
        accentColor: '#00f5d4',
      },
    },
    {
      id: 'super_smash',
      keys: ['ArrowDown', 's', 'S'],
      symbol: '↓',
      subLegend: 'S',
      label: superSmashLabel,
      icon: <Zap className="h-3.5 w-3.5" />,
      theme: {
        baseBorder: 'border-amber-500/30 hover:border-amber-400/60',
        baseText: 'text-amber-300',
        activeGlow: 'shadow-[0_0_25px_rgba(255,209,102,0.85),inset_0_0_12px_rgba(255,209,102,0.4)]',
        activeBorder: 'border-[#ffd166]',
        activeBg: 'bg-[#ffd166]/20',
        activeShadow: 'shadow-[0_1px_0_0_#b45309]',
        accentColor: '#ffd166',
      },
    },
    {
      id: 'smash',
      keys: ['ArrowRight', 'd', 'D'],
      symbol: '→',
      subLegend: 'D',
      label: smashLabel,
      icon: <Heart className="h-3.5 w-3.5 fill-current" />,
      theme: {
        baseBorder: 'border-rose-500/30 hover:border-rose-400/60',
        baseText: 'text-rose-300',
        activeGlow: 'shadow-[0_0_25px_rgba(255,0,85,0.85),inset_0_0_12px_rgba(255,0,85,0.4)]',
        activeBorder: 'border-[#ff0055]',
        activeBg: 'bg-[#ff0055]/20',
        activeShadow: 'shadow-[0_1px_0_0_#be123c]',
        accentColor: '#ff0055',
      },
    },
    {
      id: 'reset',
      keys: ['r', 'R'],
      symbol: 'R',
      subLegend: 'RESET',
      label: resetLabel,
      icon: <RotateCcw className="h-3.5 w-3.5" />,
      theme: {
        baseBorder: 'border-purple-500/30 hover:border-purple-400/60',
        baseText: 'text-purple-300',
        activeGlow: 'shadow-[0_0_25px_rgba(168,85,247,0.8),inset_0_0_12px_rgba(168,85,247,0.4)]',
        activeBorder: 'border-[#a855f7]',
        activeBg: 'bg-[#2e0854]/40',
        activeShadow: 'shadow-[0_1px_0_0_#6b21a8]',
        accentColor: '#a855f7',
      },
    },
  ];

  // Trigger Action
  const triggerAction = useCallback(
    (action: KeyAction) => {
      if (disabled) return;

      switch (action) {
        case 'pass':
          onPass?.();
          onVote?.('pass');
          break;
        case 'smash':
          onSmash?.();
          onVote?.('smash');
          break;
        case 'super_smash':
          onSuperSmash?.();
          onVote?.('super_smash');
          break;
        case 'stats':
          onStats?.();
          break;
        case 'reset':
          onReset?.();
          break;
      }
    },
    [disabled, onPass, onSmash, onSuperSmash, onStats, onReset, onVote]
  );

  // Keyboard Event Handlers for Physical Keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        disabled ||
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      for (const cap of keycaps) {
        if (cap.keys.includes(e.key)) {
          e.preventDefault();
          setPressedSet((prev) => new Set(prev).add(cap.id));
          triggerAction(cap.id);
          break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      for (const cap of keycaps) {
        if (cap.keys.includes(e.key)) {
          setPressedSet((prev) => {
            const next = new Set(prev);
            next.delete(cap.id);
            return next;
          });
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [disabled, triggerAction, keycaps]);

  // Click handler with tactile press animation
  const handleKeyClick = (action: KeyAction) => {
    if (disabled) return;
    setPressedSet((prev) => new Set(prev).add(action));
    triggerAction(action);
    setTimeout(() => {
      setPressedSet((prev) => {
        const next = new Set(prev);
        next.delete(action);
        return next;
      });
    }, 160);
  };

  return (
    <div className={`flex flex-col items-center gap-2 select-none ${className}`}>
      {/* Keycaps Cluster Container */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap p-2 sm:p-2.5 rounded-2xl bg-[#09090b]/80 border border-zinc-800/80 backdrop-blur-md shadow-2xl">
        {keycaps.map((cap) => {
          const isPressed = pressedSet.has(cap.id) || activeKey === cap.id;

          return (
            <button
              key={cap.id}
              type="button"
              disabled={disabled}
              onClick={() => handleKeyClick(cap.id)}
              title={`${cap.label} (${cap.symbol} / ${cap.subLegend})`}
              className={`group relative flex flex-col items-center justify-center transition-all duration-100 ease-out cursor-pointer outline-none focus:outline-none rounded-xl sm:rounded-2xl border ${
                compact ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-14 h-14 sm:w-16 sm:h-16'
              } ${
                isPressed
                  ? `translate-y-1 sm:translate-y-1.5 ${cap.theme.activeBorder} ${cap.theme.activeBg} ${cap.theme.activeGlow} ${cap.theme.activeShadow}`
                  : `translate-y-0 bg-gradient-to-b from-[#18181b] to-[#0e0e11] ${cap.theme.baseBorder} shadow-[0_4px_0_0_#09090b,0_8px_16px_rgba(0,0,0,0.6)] hover:brightness-110 active:translate-y-1`
              }`}
            >
              {/* Keycap Recessed Bevel Overlay */}
              <div className="absolute inset-0.5 rounded-[10px] sm:rounded-[14px] bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

              {/* Main Symbol & Sub-Legend */}
              <div className="relative z-10 flex flex-col items-center justify-center -space-y-0.5">
                <span
                  className={`font-black font-mono tracking-tighter transition-colors ${
                    compact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
                  } ${isPressed ? 'text-white drop-shadow-[0_0_10px_currentColor]' : cap.theme.baseText}`}
                  style={{ color: isPressed ? cap.theme.accentColor : undefined }}
                >
                  {cap.symbol}
                </span>

                <span className="text-[9px] sm:text-[10px] font-bold font-mono tracking-widest text-zinc-500 uppercase">
                  {cap.subLegend}
                </span>
              </div>

              {/* Mini Action Badge tooltip label below on hover/desktop */}
              {!compact && (
                <div
                  className={`absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap text-[10px] font-black px-2 py-0.5 rounded-md bg-[#09090b] border border-zinc-700 ${cap.theme.baseText} shadow-lg z-30`}
                >
                  {cap.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Optional Hint Line */}
      {showHints && (
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono tracking-wide">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00f5d4] animate-pulse" />
          <span>{hintLabel}</span>
        </div>
      )}
    </div>
  );
};
