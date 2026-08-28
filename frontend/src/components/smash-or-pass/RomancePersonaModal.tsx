'use client';
// frontend/src/components/smash-or-pass/RomancePersonaModal.tsx
import type { Dictionary } from '@/locales/types';

import React, { useMemo, useState } from 'react';
import {
  Skull,
  Shield,
  Sparkles,
  X,
  Share2,
  Check,
  RotateCcw,
} from 'lucide-react';
import { EntityItem } from '@/types/smashOrPass';

interface VoteRecord {
  character: EntityItem;
  vote: 'smash' | 'pass' | 'super_smash';
  timestamp: number;
}

interface RomancePersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  votes: VoteRecord[];
  onResetAll?: () => void;
  locale?: string;
  dict?: Dictionary;
}

export const RomancePersonaModal: React.FC<RomancePersonaModalProps> = ({
  isOpen,
  onClose,
  votes,
  onResetAll,
  locale = 'en',
  dict,
}) => {
  const [copied, setCopied] = useState(false);

  const persona = useMemo(() => {
    const archetypes: any = dict?.smashOrPass?.personaArchetypes || {};

    if (votes.length === 0) {
      return {
        title: locale === 'pl' ? 'Nieodkryta Dusza' : 'The Untapped Soul',
        subtitle:
          locale === 'pl'
            ? 'Oddaj więcej głosów, aby odkryć swój Archetyp Romansu we Mgle!'
            : 'Cast more votes to unveil your true Trial Romance Archetype!',
        description:
          locale === 'pl'
            ? 'Nie oceniłeś jeszcze wystarczającej liczby kandydatów. Głosuj, aby odkryć swoją psychologię randkową.'
            : 'You haven’t evaluated enough candidates yet. Vote on characters to reveal your dating psychology.',
        badgeColor: 'from-slate-700 to-slate-900',
        killerAffinity: 0,
        survivorAffinity: 0,
        smashRate: 0,
        superCount: 0,
        favoriteChar: null,
      };
    }

    const smashes = votes.filter((v) => v.vote === 'smash' || v.vote === 'super_smash');

    const total = votes.length;
    const smashRate = Math.round((smashes.length / total) * 100);

    const smashedKillers = smashes.filter((v) => v.character.role === 'Killer').length;
    const smashedSurvivors = smashes.filter((v) => v.character.role === 'Survivor').length;
    const smashedMonsters = smashes.filter((v) => v.character.gender === 'monster_other').length;

    const totalSmashedRoles = smashedKillers + smashedSurvivors;
    const killerAffinity = totalSmashedRoles > 0 ? Math.round((smashedKillers / totalSmashedRoles) * 100) : 50;
    const survivorAffinity = 100 - killerAffinity;

    // Determine Archetype Key
    let archKey = 'fogRomantic';
    let badgeColor = 'from-purple-600 to-pink-600';

    if (smashedMonsters >= 2) {
      archKey = 'eldritchDevotee';
      badgeColor = 'from-indigo-600 to-purple-900';
    } else if (killerAffinity >= 75) {
      archKey = 'redStainAddict';
      badgeColor = 'from-rose-600 to-red-800';
    } else if (survivorAffinity >= 75) {
      archKey = 'campfireSoulmate';
      badgeColor = 'from-emerald-500 to-teal-700';
    } else if (smashRate >= 85) {
      archKey = 'entitysParamour';
      badgeColor = 'from-pink-500 to-rose-500';
    } else if (smashRate <= 20) {
      archKey = 'coldHeartedPragmatist';
      badgeColor = 'from-slate-600 to-slate-800';
    }

    const arch = archetypes[archKey] || {};
    const title =
      arch.title ||
      (locale === 'pl' ? 'Romantyk z Mgły' : 'The Fog Romantic');
    const subtitle =
      arch.subtitle ||
      (locale === 'pl'
        ? 'Zrównoważone serce szukające pasji i adrenaliny pośród mrocznych prób.'
        : 'A balanced soul seeking passion and adrenaline across the trials.');
    const description =
      arch.desc ||
      (locale === 'pl'
        ? 'Wierzysz, że nawet w nieskończonych koszmarach Bytu można odnaleźć prawdziwą iskrę miłości.'
        : 'You believe that even within the infinite trials of the Entity, a true spark of romance can always be found.');

    return {
      title,
      subtitle,
      description,
      badgeColor,
      killerAffinity,
      survivorAffinity,
      smashRate,
      favoriteChar: smashes[0]?.character || null,
    };
  }, [votes, dict, locale]);

  if (!isOpen) return null;

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${dict?.smashOrPass?.modals?.personaTitle || 'My DBD Romance Archetype'}: ${persona.title}`,
          text: `DBD Smash or Pass: "${persona.title}" (${persona.smashRate}% Smash Rate)`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `DBD Smash or Pass: "${persona.title}" (${persona.smashRate}% Smash Rate) - ${window.location.href}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const personaModalTitle = dict?.smashOrPass?.modals?.personaTitle || 'Trial Romance Archetype';
  const survivorsLabel = dict?.smashOrPass?.filters?.survivors || 'Survivors';
  const killersLabel = dict?.smashOrPass?.filters?.killers || 'Killers';

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090b]/85 backdrop-blur-xl animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-pink-500/30 bg-zinc-950 shadow-2xl text-zinc-100 font-mono"
      >
        {/* Header Ribbon */}
        <div className={`p-6 bg-gradient-to-r ${persona.badgeColor} text-white flex items-start justify-between relative`}>
          <div className="space-y-1 z-10">
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-black text-pink-200/90">
              <Sparkles className="h-4 w-4 text-amber-300" /> {personaModalTitle}
            </span>
            <h2 className="text-2xl font-black tracking-tight">{persona.title}</h2>
            <p className="text-xs text-white/85 leading-snug max-w-sm font-sans">{persona.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer shrink-0 z-10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Persona Analysis Card */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2">
            <span className="font-bold text-pink-400 uppercase tracking-wider text-[10px] block">
              {locale === 'pl' ? 'Analiza Psychologiczna Randki' : 'Dating Psychology Breakdown'}
            </span>
            <p className="text-zinc-300 leading-relaxed text-xs font-sans">{persona.description}</p>
          </div>

          {/* Affinities Breakdown */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Shield className="h-3.5 w-3.5" /> {survivorsLabel} ({persona.survivorAffinity}{dict?.smashOrPass?.percentClose || '%)'}
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <Skull className="h-3.5 w-3.5" /> {killersLabel} ({persona.killerAffinity}{dict?.smashOrPass?.percentClose || '%)'}
                </span>
              </div>
              <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${persona.survivorAffinity}%` }}
                  className="h-full bg-emerald-500 transition-all duration-700"
                />
                <div
                  style={{ width: `${persona.killerAffinity}%` }}
                  className="h-full bg-rose-500 transition-all duration-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-zinc-400">{locale === 'pl' ? 'Oceniono łącznie:' : 'Total Evaluated:'}</span>
              <span className="font-bold text-zinc-200">
                {votes.length} {locale === 'pl' ? 'kandydatów' : 'candidates'}
              </span>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-[#ff0055] text-white font-bold text-xs hover:from-rose-500 hover:to-pink-500 transition-all shadow-lg cursor-pointer"
            >
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              <span>{copied ? (locale === 'pl' ? 'Skopiowano do schowka!' : 'Copied to Clipboard!') : (locale === 'pl' ? 'Udostępnij Archetyp' : 'Share Archetype')}</span>
            </button>

            {onResetAll && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onResetAll();
                }}
                className="px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                title={dict?.smashOrPass?.tooltips?.resetAllVotes || 'Reset Voting Data'}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
