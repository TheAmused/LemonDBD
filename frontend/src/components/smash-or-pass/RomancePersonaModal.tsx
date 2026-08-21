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
import { CharacterRosterItem } from './characterRoster';

interface VoteRecord {
  character: CharacterRosterItem;
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
  locale = 'en',
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
    let title = 'The Balanced Heartseeker';
    let subtitle = 'A connoisseur of beauty across both sides of the Fog.';
    let description = 'You appreciate both the protective warmth of survivors and the dangerous allure of the killers in equal measure.';
    let badgeColor = 'from-purple-600 to-pink-600';

    if (smashedMonsters >= 2) {
      title = 'The Eldritch & Monster Devotee';
      subtitle = 'Love beyond mortal comprehension.';
      description = 'You are fascinated by tentacles, biomatter, and cosmic entities. Conventional romance is too ordinary for your taste.';
      badgeColor = 'from-indigo-600 to-purple-800';
    } else if (smashRate >= 75) {
      title = 'The Seductive Entity Champion';
      subtitle = 'A heart big enough to embrace the entire Trial.';
      description = 'You see romance and charisma in almost everyone. Your passion burns bright and hot across the Fog.';
      badgeColor = 'from-rose-600 to-pink-600';
    } else if (smashRate <= 25) {
      title = 'The Cold-Blooded Trial Judge';
      subtitle = 'Standards as sharp as the Executioner’s Great Knife.';
      description = 'Very few earn your affection. You maintain razor-sharp standards and only the absolute elite catch your eye.';
      badgeColor = 'from-slate-700 to-slate-900';
    } else if (killerAffinity >= 70) {
      title = 'The Danger Romantic (Killer Lover)';
      subtitle = 'You like them lethal, intense, and sharp.';
      description = 'Red flags look like carnival lights to you. You love the adrenaline rush of dating someone who could mori you.';
      badgeColor = 'from-red-600 to-rose-900';
    } else if (survivorAffinity >= 70) {
      title = 'The Campfire Sweetheart';
      subtitle = 'Wholesome teamwork and soothing company.';
      description = 'You seek loyalty, generator repairs, and comforting cuddles by the campfire when the darkness creeps in.';
      badgeColor = 'from-emerald-600 to-teal-700';
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
    const text = `Dead by Daylight Smash or Pass: My Romance Archetype is [${persona.title}]! (${persona.smashRate}% Smash Rate). Find your match on LemonDBD!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-pink-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-6 sm:p-7 shadow-2xl space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/40">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-100">Trial Romance Archetype</h2>
              <span className="text-[11px] text-slate-400">Based on your {votes.length} votes</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Archetype Hero Card */}
        <div
          className={`rounded-2xl p-5 border border-white/10 bg-gradient-to-br ${persona.badgeColor} shadow-xl space-y-2 text-center text-white`}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-pink-200 border border-white/10">
            Your Match Identity
          </span>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight">{persona.title}</h3>
          <p className="text-xs text-white/90 italic font-medium">{persona.subtitle}</p>
          <p className="text-xs text-white/80 leading-relaxed pt-1">{persona.description}</p>
        </div>

        {/* Breakdown Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
            <span className="text-[10px] font-bold text-rose-400 uppercase">Smash Rate</span>
            <p className="text-lg font-black text-slate-100">{persona.smashRate}%</p>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
            <span className="text-[10px] font-bold text-red-400 uppercase">Killer Love</span>
            <p className="text-lg font-black text-slate-100">{persona.killerAffinity}%</p>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
            <span className="text-[10px] font-bold text-emerald-400 uppercase">Survivor Love</span>
            <p className="text-lg font-black text-slate-100">{persona.survivorAffinity}%</p>
          </div>
        </div>

        {/* Top Flame/Smash Highlight */}
        {persona.favoriteChar && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-pink-500/20">
            <Flame className="h-6 w-6 text-amber-400 shrink-0" />
            <div className="text-left text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Your Top Flame</span>
              <p className="font-extrabold text-slate-100">{persona.favoriteChar.name} <span className="text-rose-400 font-normal">({persona.favoriteChar.title})</span></p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs transition-all shadow-md cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Share Persona'}</span>
          </button>

          {onResetAll && (
            <button
              type="button"
              onClick={() => {
                onResetAll();
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 text-slate-300 text-xs font-bold transition-all border border-slate-700 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Votes</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
