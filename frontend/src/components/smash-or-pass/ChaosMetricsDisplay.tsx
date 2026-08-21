// frontend/src/components/smash-or-pass/ChaosMetricsDisplay.tsx
'use client';

import React, { useMemo } from 'react';
import {
  Skull,
  Flame,
  Shield,
  Heart,
  Sparkles,
  AlertTriangle,
  Quote,
  Activity,
  Zap,
} from 'lucide-react';
import { CharacterRosterItem } from './characterRoster';
import { EntityItem, EntityStatItem, LeaderboardItem } from '@/types/smashOrPass';

export interface ChaosMetricsDisplayProps {
  character?: CharacterRosterItem | EntityItem | any;
  stats?:
    | EntityStatItem
    | LeaderboardItem
    | {
        smash_count?: number;
        pass_count?: number;
        super_smash_count?: number;
        total_votes?: number;
        smash_rate?: number;
        chaos_rating?: number;
        [key: string]: any;
      }
    | null;
  sessionStats?: {
    smashes: number;
    passes: number;
    superSmashes?: number;
    total: number;
    smashRate: number;
  } | null;
  dict?: any;
  compact?: boolean;
  className?: string;
  onOpenStats?: (character?: any) => void;
}

export type DangerLevelType = 'Low' | 'Medium' | 'High' | 'Lethal' | 'Eldritch';

export const ChaosMetricsDisplay: React.FC<ChaosMetricsDisplayProps> = ({
  character,
  stats,
  sessionStats,
  dict,
  compact = false,
  className = '',
  onOpenStats,
}) => {
  // Localization references
  const chaosRatingLabel =
    dict?.smashOrPass?.statsDetail?.chaosRating ||
    dict?.smashOrPass?.chaosRating ||
    'Chaos Rating';
  const dangerLevelLabel =
    dict?.smashOrPass?.statsDetail?.dangerLevel ||
    dict?.smashOrPass?.dangerLevel ||
    'Danger Level';
  const traitsLabel =
    dict?.smashOrPass?.statsDetail?.traits ||
    dict?.smashOrPass?.traits ||
    'Compatibility Traits';
  const statsDetailLabel =
    dict?.smashOrPass?.controls?.stats ||
    dict?.smashOrPass?.stats ||
    'Dossier & Stats';

  // 1. Calculate deterministic Chaos Rating (0-100)
  const chaosScore = useMemo(() => {
    if (character?.metadata?.chaos_score !== undefined) {
      return Number(character.metadata.chaos_score);
    }
    if (stats?.chaos_rating !== undefined && stats.chaos_rating !== null) {
      return Number(stats.chaos_rating);
    }
    if (!character) return sessionStats?.smashRate ?? 50;

    // Deterministic hash based on slug and role
    const slugStr = character.slug || character.name || 'dbd';
    let hash = 0;
    for (let i = 0; i < slugStr.length; i++) {
      hash = (hash << 5) - hash + slugStr.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash);

    const isKiller = character.role === 'Killer';
    const isMonster = character.gender === 'monster_other';

    if (isKiller) {
      return isMonster ? 88 + (absHash % 12) : 68 + (absHash % 25);
    }
    return 20 + (absHash % 42);
  }, [character, stats, sessionStats]);

  // 2. Derive Danger Level
  const dangerLevel: DangerLevelType = useMemo(() => {
    if (character?.metadata?.danger_level) {
      return character.metadata.danger_level as DangerLevelType;
    }
    if (chaosScore >= 88) return 'Lethal';
    if (chaosScore >= 68) return 'High';
    if (chaosScore >= 42) return 'Medium';
    return 'Low';
  }, [character, chaosScore]);

  // Danger Level Badging Theme
  const dangerTheme = useMemo(() => {
    switch (dangerLevel) {
      case 'Lethal':
      case 'Eldritch':
        return {
          label: 'Lethal',
          border: 'border-[#ff0055]/60',
          bg: 'bg-[#ff0055]/15',
          text: 'text-[#ff0055]',
          glow: 'shadow-[0_0_15px_rgba(255,0,85,0.5)]',
          icon: <Flame className="h-3.5 w-3.5 text-[#ff0055] animate-pulse" />,
        };
      case 'High':
        return {
          label: 'High',
          border: 'border-orange-500/50',
          bg: 'bg-orange-950/40',
          text: 'text-orange-400',
          glow: 'shadow-[0_0_15px_rgba(249,115,22,0.4)]',
          icon: <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />,
        };
      case 'Medium':
        return {
          label: 'Medium',
          border: 'border-[#ffd166]/50',
          bg: 'bg-amber-950/40',
          text: 'text-[#ffd166]',
          glow: 'shadow-[0_0_15px_rgba(255,209,102,0.4)]',
          icon: <Zap className="h-3.5 w-3.5 text-[#ffd166]" />,
        };
      case 'Low':
      default:
        return {
          label: 'Low',
          border: 'border-[#00f5d4]/50',
          bg: 'bg-emerald-950/40',
          text: 'text-[#00f5d4]',
          glow: 'shadow-[0_0_15px_rgba(0,245,212,0.4)]',
          icon: <Shield className="h-3.5 w-3.5 text-[#00f5d4]" />,
        };
    }
  }, [dangerLevel]);

  // 3. Dynamic Persona Compatibility Analysis
  const personaAnalysis = useMemo(() => {
    const smashRate = stats?.smash_rate ?? sessionStats?.smashRate ?? 50;

    if (chaosScore >= 75 && smashRate >= 55) {
      return {
        title: dict?.smashOrPass?.tiers?.fatalAttraction || 'Fatal Attraction',
        subtitle: 'High volatility meets irresistible chemistry in the Fog.',
        badgeColor: 'border-[#ff0055]/50 bg-[#ff0055]/15 text-[#ff0055]',
      };
    }
    if (character?.role === 'Killer' && chaosScore >= 70) {
      return {
        title: 'Twisted Bond',
        subtitle: 'Dangerous allure masking apex predatory instincts.',
        badgeColor: 'border-purple-500/50 bg-[#2e0854]/40 text-purple-300',
      };
    }
    if (chaosScore >= 85) {
      return {
        title: dict?.smashOrPass?.tiers?.eldritchVoid || 'Primal Terror',
        subtitle: 'Cosmic horror and supernatural entity resonance.',
        badgeColor: 'border-rose-500/50 bg-rose-950/40 text-rose-300',
      };
    }
    if (character?.role === 'Survivor' && chaosScore <= 45) {
      return {
        title: 'Sacred Sanctuary',
        subtitle: 'Loyal campfire companion with high survivor survival synergy.',
        badgeColor: 'border-[#00f5d4]/50 bg-emerald-950/40 text-[#00f5d4]',
      };
    }
    return {
      title: dict?.smashOrPass?.tiers?.godTier || 'Chaotic Spark',
      subtitle: 'Unpredictable trial chemistry waiting to unfold.',
      badgeColor: 'border-[#ffd166]/50 bg-amber-950/40 text-[#ffd166]',
    };
  }, [chaosScore, stats, sessionStats, character, dict]);

  // 4. Trait Badges
  const traits = useMemo(() => {
    if (!character) {
      return [
        { text: 'Chaotic Entity', type: 'gold' as const },
        { text: 'Trial Veteran', type: 'mint' as const },
      ];
    }
    const list: Array<{ text: string; type: 'green' | 'red' | 'gold' | 'mint' }> = [];

    if (character.greenFlags && Array.isArray(character.greenFlags)) {
      character.greenFlags.slice(0, 2).forEach((flag: string) => {
        list.push({ text: flag, type: 'mint' });
      });
    }
    if (character.redFlags && Array.isArray(character.redFlags)) {
      character.redFlags.slice(0, 1).forEach((flag: string) => {
        list.push({ text: flag, type: 'red' });
      });
    }
    if (character.metadata?.compatibility_tags && Array.isArray(character.metadata.compatibility_tags)) {
      character.metadata.compatibility_tags.slice(0, 3).forEach((tag: string) => {
        list.push({ text: tag, type: 'gold' });
      });
    }

    if (list.length === 0) {
      if (character.role === 'Killer') {
        list.push({ text: 'Lethal Presence', type: 'red' });
        list.push({ text: 'Relentless Stalker', type: 'gold' });
      } else {
        list.push({ text: 'Altruistic Healer', type: 'mint' });
        list.push({ text: 'Generator Specialist', type: 'mint' });
      }
    }

    return list;
  }, [character]);

  // 5. Lore Quote Snippet
  const loreQuote = useMemo(() => {
    if (!character) return null;
    return (
      character.metadata?.lore_quote ||
      character.metadata?.quote ||
      character.dealbreaker ||
      character.idealDate ||
      (character.bio ? character.bio.slice(0, 110) + '...' : null)
    );
  }, [character]);

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl border border-zinc-800 bg-[#09090b]/90 backdrop-blur-xl p-4 sm:p-5 shadow-2xl text-slate-200 transition-all ${className}`}
    >
      {/* Top Header: Danger Level Badge & Chaos Numerical Readout */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
        {/* Danger Level Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-bold">
            {dangerLevelLabel}:
          </span>
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black uppercase font-mono border ${dangerTheme.border} ${dangerTheme.bg} ${dangerTheme.text} ${dangerTheme.glow} transition-all`}
          >
            {dangerTheme.icon}
            <span>{dangerTheme.label}</span>
          </div>
        </div>

        {/* Chaos Numerical Readout */}
        <div className="flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-[#00f5d4] animate-pulse" />
          <span className="text-sm sm:text-base font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#00f5d4] via-[#ffd166] to-[#ff0055]">
            {chaosScore}%
          </span>
        </div>
      </div>

      {/* Animated Chaos Rating Bar (0-100%) */}
      <div className="space-y-1.5 py-3">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#ffd166]" />
            {chaosRatingLabel}
          </span>
          <span className="text-zinc-500">Volatile Aura</span>
        </div>

        <div className="relative h-2.5 sm:h-3 w-full rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden shadow-inner">
          {/* Animated Fill Bar with Pulsing Eerie Glow */}
          <div
            className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-[#00f5d4] via-[#ffd166] to-[#ff0055] shadow-[0_0_15px_rgba(255,0,85,0.6)]"
            style={{ width: `${Math.min(100, Math.max(0, chaosScore))}%` }}
          />
          {/* Shimmer Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-pulse pointer-events-none" />
        </div>
      </div>

      {/* Compatibility & Chaos Analysis Persona */}
      <div className="py-2.5 my-1 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 p-3 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase font-mono border ${personaAnalysis.badgeColor}`}
          >
            <Heart className="h-3 w-3 fill-current" />
            <span>{personaAnalysis.title}</span>
          </div>

          {onOpenStats && (
            <button
              type="button"
              onClick={() => onOpenStats(character)}
              className="text-[10px] font-bold font-mono text-[#00f5d4] hover:underline cursor-pointer flex items-center gap-1"
            >
              {statsDetailLabel} &rarr;
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-300/90 leading-relaxed font-sans">
          {personaAnalysis.subtitle}
        </p>
      </div>

      {/* Trait Badges */}
      {!compact && traits.length > 0 && (
        <div className="pt-2 space-y-1.5">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
            {traitsLabel}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {traits.map((t, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                  t.type === 'mint'
                    ? 'border-[#00f5d4]/40 bg-[#00f5d4]/10 text-[#00f5d4]'
                    : t.type === 'red'
                    ? 'border-[#ff0055]/40 bg-[#ff0055]/10 text-[#ff0055]'
                    : 'border-[#ffd166]/40 bg-[#ffd166]/10 text-[#ffd166]'
                }`}
              >
                {t.type === 'mint' && <Shield className="h-3 w-3" />}
                {t.type === 'red' && <Skull className="h-3 w-3" />}
                {t.type === 'gold' && <Sparkles className="h-3 w-3" />}
                <span>{t.text}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lore Quote Snippet */}
      {!compact && loreQuote && (
        <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-start gap-2 text-xs italic text-zinc-400">
          <Quote className="h-4 w-4 text-[#ffd166] shrink-0 mt-0.5 opacity-80" />
          <p className="leading-relaxed text-zinc-300 font-serif line-clamp-2">
            &ldquo;{loreQuote}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
};
