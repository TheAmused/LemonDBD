// frontend/src/components/smash-or-pass/TactileKeycaps.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { SmashSounds } from './SmashSoundEffects';

export interface TactileKeycapsProps {
  onPass: () => void;
  onSmash: () => void;
  onStats: () => void;
  onReset: () => void;
  disabled?: boolean;
  dict?: any;
}

interface KeycapConfig {
  id: string;
  primaryKey: string;
  subKey: string;
  label: string;
  action: () => void;
  colorTheme: {
    border: string;
    borderActive: string;
    glow: string;
    glowActive: string;
    text: string;
    bg: string;
    bgActive: string;
    icon: React.ReactNode;
  };
  keys: string[];
}

export const TactileKeycaps: React.FC<TactileKeycapsProps> = ({
  onPass,
  onSmash,
  onStats,
  onReset,
  disabled = false,
  dict,
}) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // Localized Labels
  const passLabel = dict?.smashOrPass?.controls?.pass || dict?.smashOrPass?.pass || 'Pass';
  const smashLabel = dict?.smashOrPass?.controls?.smash || dict?.smashOrPass?.smash || 'Smash';
  const statsLabel = dict?.smashOrPass?.controls?.stats || dict?.smashOrPass?.stats || 'Info';
  const resetLabel = dict?.smashOrPass?.controls?.reset || dict?.smashOrPass?.reset || 'Reset';

  // 4 Keycaps: Left (Pass), Up (Stats), Right (Smash), R (Reset)
  const keycaps: KeycapConfig[] = useMemo(() => [
    {
      id: 'pass',
      primaryKey: '←',
      subKey: 'A',
      label: passLabel,
      action: onPass,
      keys: ['ArrowLeft', 'a', 'A'],
      colorTheme: {
        border: 'border-cyan-500/40',
        borderActive: 'border-[#00f5d4]',
        glow: 'hover:shadow-[0_0_20px_rgba(0,245,212,0.35)]',
        glowActive: 'shadow-[0_0_30px_rgba(0,245,212,0.85)]',
        text: 'text-[#00f5d4]',
        bg: 'bg-cyan-950/20',
        bgActive: 'bg-cyan-950/60',
        icon: <ArrowLeft className="h-4 w-4" />,
      },
    },
    {
      id: 'stats',
      primaryKey: '↑',
      subKey: 'W',
      label: statsLabel,
      action: onStats,
      keys: ['ArrowUp', 'w', 'W'],
      colorTheme: {
        border: 'border-emerald-500/40',
        borderActive: 'border-emerald-400',
        glow: 'hover:shadow-[0_0_20px_rgba(52,211,153,0.35)]',
        glowActive: 'shadow-[0_0_30px_rgba(52,211,153,0.85)]',
        text: 'text-emerald-300',
        bg: 'bg-emerald-950/20',
        bgActive: 'bg-emerald-950/60',
        icon: <ArrowUp className="h-4 w-4" />,
      },
    },
    {
      id: 'smash',
      primaryKey: '→',
      subKey: 'D',
      label: smashLabel,
      action: onSmash,
      keys: ['ArrowRight', 'd', 'D'],
      colorTheme: {
        border: 'border-pink-500/40',
        borderActive: 'border-[#ff0055]',
        glow: 'hover:shadow-[0_0_20px_rgba(255,0,85,0.4)]',
        glowActive: 'shadow-[0_0_30px_rgba(255,0,85,0.85)]',
        text: 'text-[#ff0055]',
        bg: 'bg-rose-950/20',
        bgActive: 'bg-rose-950/60',
        icon: <ArrowRight className="h-4 w-4" />,
      },
    },
    {
      id: 'reset',
      primaryKey: 'R',
      subKey: 'RESET',
      label: resetLabel,
      action: onReset,
      keys: ['r', 'R'],
      colorTheme: {
        border: 'border-purple-500/40',
        borderActive: 'border-purple-400',
        glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.35)]',
        glowActive: 'shadow-[0_0_30px_rgba(168,85,247,0.85)]',
        text: 'text-purple-300',
        bg: 'bg-purple-950/20',
        bgActive: 'bg-purple-950/60',
        icon: <RotateCcw className="h-4 w-4" />,
      },
    },
  ], [passLabel, smashLabel, statsLabel, resetLabel, onPass, onSmash, onStats, onReset]);

  const triggerAction = useCallback((id: string, action: () => void) => {
    if (disabled) return;
    setActiveKey(id);
    SmashSounds.playHoverTick();
    action();

    setTimeout(() => {
      setActiveKey((curr) => (curr === id ? null : curr));
    }, 200);
  }, [disabled]);

  // Global physical keyboard binding
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      // Ignore when user is typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      for (const cap of keycaps) {
        if (cap.keys.includes(e.key)) {
          e.preventDefault();
          setActiveKey(cap.id);
          cap.action();
          break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      for (const cap of keycaps) {
        if (cap.keys.includes(e.key)) {
          setActiveKey((curr) => (curr === cap.id ? null : curr));
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
  }, [disabled, keycaps]);

  return (
    <div className="flex flex-col items-center justify-center gap-2 mt-4 select-none">
      {/* 3D Tactile Keycaps Container */}
      <div className="flex items-center justify-center gap-2.5 sm:gap-3 p-2 rounded-2xl bg-zinc-950/80 border border-zinc-800/60 shadow-2xl backdrop-blur-xl">
        {keycaps.map((cap) => {
          const isActive = activeKey === cap.id;
          const isReset = cap.id === 'reset';

          return (
            <button
              key={cap.id}
              type="button"
              disabled={disabled}
              onClick={() => triggerAction(cap.id, cap.action)}
              title={`${cap.label} (${cap.primaryKey} / ${cap.subKey})`}
              className={`group relative flex flex-col items-center justify-center rounded-xl transition-all duration-150 cursor-pointer ${
                isReset ? 'w-14 sm:w-16 h-14 sm:h-16' : 'w-12 sm:w-14 h-14 sm:h-16'
              } ${
                isActive
                  ? `translate-y-1 ${cap.colorTheme.bgActive} ${cap.colorTheme.borderActive} ${cap.colorTheme.glowActive} border-2`
                  : `translate-y-0 ${cap.colorTheme.bg} ${cap.colorTheme.border} ${cap.colorTheme.glow} border bg-zinc-900/90 shadow-[0_4px_0_0_rgba(0,0,0,0.6)]`
              } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'active:translate-y-1'}`}
            >
              {/* Primary Key / Icon */}
              <div className={`flex items-center justify-center font-mono font-black text-sm sm:text-base ${cap.colorTheme.text}`}>
                {cap.primaryKey}
              </div>

              {/* Sub-Legend Letter */}
              <span className={`text-[10px] font-bold font-mono tracking-wider transition-colors ${
                isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
              }`}>
                {cap.subKey}
              </span>
            </button>
          );
        })}
      </div>

      {/* Instruction Subtitle */}
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 pt-0.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span>
          {dict?.smashOrPass?.controls?.hint || 'Użyj strzałek lub przeciągnij, aby zagłosować'}
        </span>
      </div>
    </div>
  );
};
