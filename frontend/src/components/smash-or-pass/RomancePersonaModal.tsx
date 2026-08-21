// frontend/src/components/smash-or-pass/RomancePersonaModal.tsx
'use client';

import React, { useMemo } from 'react';
import {
  Heart,
  Flame,
  Skull,
  Shield,
  Sparkles,
  X,
  Share2,
  Trophy,
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
  dict?: any;
}

export const RomancePersonaModal: React.FC<RomancePersonaModalProps> = ({
  isOpen,
  onClose,
  votes,
  onResetAll,
  dict,
}) => {
  const [copied, setCopied] = React.useState(false);

  const persona = useMemo(() => {
    if (votes.length === 0) {
      return {
        title: 'The Untapped Soul',
        subtitle: 'Cast more votes to unveil your true Trial Romance Archetype!',
        description: 'You haven’t evaluated enough candidates yet. Vote on characters to reveal your dating psychology.',
        badgeColor: 'from-slate-700 to-slate-900',
        killerAffinity: 0,
        survivorAffinity: 0,
        smashRate: 0,
        superCount: 0,
        favoriteChar: null,
      };
    }

    const smashes = votes.filter((v) => v.vote === 'smash' || v.vote === 'super_smash');
    const passes = votes.filter((v) => v.vote === 'pass');

    const total = votes.length;
    const smashRate = Math.round((smashes.length / total) * 100);

    const smashedKillers = smashes.filter((v) => v.character.role === 'Killer').length;
    const smashedSurvivors = smashes.filter((v) => v.character.role === 'Survivor').length;
    const smashedMonsters = smashes.filter((v) => v.character.gender === 'monster_other').length;

    const totalSmashedRoles = smashedKillers + smashedSurvivors;
    const killerAffinity = totalSmashedRoles > 0 ? Math.round((smashedKillers / totalSmashedRoles) * 100) : 50;
    const survivorAffinity = 100 - killerAffinity;

    // Determine Archetype
    let title = 'The Balanced Trial Romantic';
    let subtitle = 'You appreciate both the danger of the Fog and the warmth of campfire bonds.';
    let description =
      'You don’t judge solely on roles or terror radiuses—you seek authentic connections, balancing survival instinct with fatal attraction.';
    let badgeColor = 'from-purple-600 to-pink-600';

    if (smashedMonsters >= 2) {
      title = 'The Eldritch Devotee';
      subtitle = 'Incomprehensible horrors and ancient beings are your true love language.';
      description =
        'Why settle for mortal romance when the cosmic void is calling? You embrace tentacles, teeth, and cosmic mystery.';
      badgeColor = 'from-indigo-600 to-purple-900';
    } else if (killerAffinity >= 75) {
      title = 'The Red Stain Addict';
      subtitle = 'Danger is your turn-on, and terror radiuses make your heart flutter.';
      description =
        'Mori animations are just aggressive cuddles in your book. You are drawn to power, menace, and dark charisma.';
      badgeColor = 'from-rose-600 to-red-800';
    } else if (survivorAffinity >= 75) {
      title = 'The Campfire Soulmate';
      subtitle = 'Wholesome teamwork and altruistic healing melt your heart.';
      description =
        'You seek companionship, genuine smiles, and someone who will unhook you before opening the exit gate.';
      badgeColor = 'from-emerald-500 to-teal-700';
    } else if (smashRate >= 85) {
      title = 'The Entity’s Paramour';
      subtitle = 'You see beauty, charm, and romance in almost every single soul in the Fog.';
      description =
        'High standards? Never heard of them. Your heart is an endless sanctuary for all survivors and killers alike.';
      badgeColor = 'from-pink-500 to-rose-500';
    } else if (smashRate <= 20) {
      title = 'The Cold-Hearted Pragmatist';
      subtitle = 'Extremely selective, immune to charms, focused solely on survival.';
      description =
        'Very few can pass your stringent dating checklist. You need perfection, flawless perks, and zero red flags.';
      badgeColor = 'from-slate-600 to-slate-800';
    }

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
  }, [votes]);

  if (!isOpen) return null;

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `My DBD Romance Archetype: ${persona.title}`,
          text: `I took the Dead by Daylight Smash or Pass test and got "${persona.title}"! (${persona.smashRate}% Smash Rate)`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `I took the Dead by Daylight Smash or Pass test and got "${persona.title}"! (${persona.smashRate}% Smash Rate) - Play at ${window.location.href}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-pink-500/30 bg-slate-900 shadow-2xl text-slate-100"
      >
        {/* Header Ribbon */}
        <div className={`p-6 bg-gradient-to-r ${persona.badgeColor} text-white flex items-start justify-between relative`}>
          <div className="space-y-1 z-10">
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-black text-pink-200/90 font-mono">
              <Sparkles className="h-4 w-4 text-amber-300" /> Trial Romance Archetype
            </span>
            <h2 className="text-2xl font-black font-mono tracking-tight">{persona.title}</h2>
            <p className="text-xs text-white/80 leading-snug max-w-sm">{persona.subtitle}</p>
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
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <span className="font-bold text-pink-400 uppercase tracking-wider text-[10px] block">
              Dating Psychology Breakdown
            </span>
            <p className="text-slate-300 leading-relaxed text-xs">{persona.description}</p>
          </div>

          {/* Affinities Breakdown */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Shield className="h-3.5 w-3.5" /> Survivors ({persona.survivorAffinity}%)
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <Skull className="h-3.5 w-3.5" /> Killers ({persona.killerAffinity}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
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

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 font-mono">
              <span className="text-slate-400">Total Evaluated:</span>
              <span className="font-bold text-slate-200">{votes.length} candidates</span>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold text-xs hover:from-rose-500 hover:to-pink-500 transition-all shadow-lg cursor-pointer"
            >
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Share Archetype'}</span>
            </button>

            {onResetAll && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onResetAll();
                }}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                title="Reset Voting Data"
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
