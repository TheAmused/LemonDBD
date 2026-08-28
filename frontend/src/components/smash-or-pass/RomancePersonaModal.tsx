'use client';
// frontend/src/components/smash-or-pass/RomancePersonaModal.tsx

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
import type { Dictionary } from '@/locales/types';
import type { EntityItem } from '@/types/smashOrPass';

interface VoteRecord {
  character: EntityItem;
  vote: 'smash' | 'pass' | 'super_smash';
  timestamp: number;
}

interface PersonaArchetypeEntry {
  title?: string;
  subtitle?: string;
  desc?: string;
}

interface RomancePersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  votes: VoteRecord[];
  onResetAll?: () => void;
  locale?: string;
  dict?: Dictionary | any;
}

export const RomancePersonaModal: React.FC<RomancePersonaModalProps> = ({
  isOpen,
  onClose,
  votes,
  onResetAll,
  locale = 'en',
  dict,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const persona = useMemo(() => {
    const rawArchetypes = (dict?.smashOrPass?.personaArchetypes || {}) as Record<string, PersonaArchetypeEntry>;

    if (votes.length === 0) {
      const untapped = rawArchetypes.untappedSoul || {};
      return {
        title: untapped.title || '',
        subtitle: untapped.subtitle || '',
        description: untapped.desc || '',
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

    const arch = rawArchetypes[archKey] || {};
    const title = arch.title || '';
    const subtitle = arch.subtitle || '';
    const description = arch.desc || '';

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
  }, [votes, dict]);

  if (!isOpen) return null;

  const rawSmash = dict?.smashOrPass;

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({
          title: `${rawSmash?.modals?.personaTitle || ''}: ${persona.title}`.trim(),
          text: `"${persona.title}" (${persona.smashRate}%)`,
          url: window.location.href,
        })
        .catch(() => { });
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(
        `"${persona.title}" (${persona.smashRate}%) - ${window.location.href}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const personaModalTitle = rawSmash?.modals?.personaTitle || '';
  const survivorsLabel = rawSmash?.filters?.survivors || '';
  const killersLabel = rawSmash?.filters?.killers || '';
  const datingPsychologyLabel = rawSmash?.datingPsychology || '';
  const totalEvaluatedLabel = rawSmash?.totalEvaluated || '';
  const candidatesLabel = rawSmash?.candidates || rawSmash?.candidatesWord || '';
  const copiedToClipboardLabel = rawSmash?.copiedToClipboard || '';
  const shareArchetypeLabel = rawSmash?.shareArchetype || '';
  const resetVotesLabel = rawSmash?.tooltips?.resetAllVotes || '';
  const percentClose = rawSmash?.percentClose || '%)';

  const affinityAriaLabel = rawSmash?.affinityComparisonAria
    ? rawSmash.affinityComparisonAria
      .replace('{survivor}', survivorsLabel)
      .replace('{killer}', killersLabel)
    : `${survivorsLabel} (${persona.survivorAffinity}%) - ${killersLabel} (${persona.killerAffinity}%)`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="romance-persona-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090b]/85 backdrop-blur-xl animate-in fade-in duration-200 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-pink-500/30 bg-zinc-950 shadow-2xl text-zinc-100 font-mono"
      >
        {/* Header Ribbon */}
        <div className={`p-6 bg-gradient-to-r ${persona.badgeColor} text-white flex items-start justify-between relative`}>
          <div className="space-y-1 z-10">
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-black text-pink-200/90">
              <Sparkles className="h-4 w-4 text-amber-300" aria-hidden="true" /> {personaModalTitle}
            </span>
            <h2 id="romance-persona-title" className="text-2xl font-black tracking-tight">{persona.title}</h2>
            {persona.subtitle && (
              <p className="text-xs text-white/85 leading-snug max-w-sm font-sans">{persona.subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={dict?.modal?.close || ''}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer shrink-0 z-10"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Persona Analysis Card */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2">
            <span className="font-bold text-pink-400 uppercase tracking-wider text-[10px] block">
              {datingPsychologyLabel}
            </span>
            <p className="text-zinc-300 leading-relaxed text-xs font-sans">{persona.description}</p>
          </div>

          {/* Affinities Breakdown */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Shield className="h-3.5 w-3.5" aria-hidden="true" /> {survivorsLabel} ({persona.survivorAffinity}{percentClose}
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <Skull className="h-3.5 w-3.5" aria-hidden="true" /> {killersLabel} ({persona.killerAffinity}{percentClose}
                </span>
              </div>
              <div
                className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden flex"
                role="progressbar"
                aria-valuenow={persona.survivorAffinity}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={affinityAriaLabel}
              >
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
              <span className="text-zinc-400">{totalEvaluatedLabel}</span>
              <span className="font-bold text-zinc-200 font-mono">
                {votes.length} {candidatesLabel}
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
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
              <span>
                {copied ? copiedToClipboardLabel : shareArchetypeLabel}
              </span>
            </button>

            {onResetAll && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onResetAll();
                }}
                className="px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                title={resetVotesLabel}
                aria-label={resetVotesLabel}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};