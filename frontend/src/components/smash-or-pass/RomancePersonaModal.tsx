'use client';
// frontend/src/components/smash-or-pass/RomancePersonaModal.tsx

import React, { useMemo, useState } from 'react';
import {
  Skull,
  Shield,
  Sparkles,
  Share2,
  Check,
  RotateCcw,
  Heart,
  Flame,
  Zap,
  Compass,
  ArrowRight,
} from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { EntityItem } from '@/types/smashOrPass';
import { Modal } from '@/components/common/Modal';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import { getBackendBaseUrl } from '@/utils/perkUtils';

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
  const backendBase = getBackendBaseUrl();
  const rawSmash = dict?.smashOrPass;

  const persona = useMemo(() => {
    const rawArchetypes = (rawSmash?.personaArchetypes || {}) as Record<string, PersonaArchetypeEntry>;

    if (votes.length === 0) {
      const untapped = rawArchetypes.untappedSoul || {};
      return {
        title: untapped.title || 'The Untapped Soul',
        subtitle: untapped.subtitle || 'Your trial desires remain veiled in the Fog.',
        description: untapped.desc || 'Evaluate candidates to unlock your psychological profile, dating analysis, and affinity balance.',
        badgeColor: 'from-slate-800 via-zinc-900 to-black',
        borderColor: 'border-zinc-700/60',
        glowColor: 'rgba(148, 163, 184, 0.2)',
        icon: <Compass className="h-6 w-6 text-slate-300 animate-spin-slow" />,
        killerAffinity: 0,
        survivorAffinity: 0,
        smashRate: 0,
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
    let badgeColor = 'from-purple-600 via-pink-600 to-rose-950';
    let borderColor = 'border-pink-500/60';
    let glowColor = 'rgba(236, 72, 153, 0.35)';
    let archIcon = <Sparkles className="h-6 w-6 text-pink-300" />;

    if (smashedMonsters >= 2) {
      archKey = 'eldritchDevotee';
      badgeColor = 'from-indigo-600 via-purple-700 to-slate-950';
      borderColor = 'border-purple-500/60';
      glowColor = 'rgba(168, 85, 247, 0.35)';
      archIcon = <Skull className="h-6 w-6 text-purple-300" />;
    } else if (killerAffinity >= 75) {
      archKey = 'redStainAddict';
      badgeColor = 'from-rose-600 via-red-700 to-zinc-950';
      borderColor = 'border-red-500/60';
      glowColor = 'rgba(239, 68, 68, 0.35)';
      archIcon = <Flame className="h-6 w-6 text-red-300" />;
    } else if (survivorAffinity >= 75) {
      archKey = 'campfireSoulmate';
      badgeColor = 'from-emerald-500 via-teal-700 to-zinc-950';
      borderColor = 'border-teal-500/60';
      glowColor = 'rgba(20, 184, 166, 0.35)';
      archIcon = <Shield className="h-6 w-6 text-emerald-300" />;
    } else if (smashRate >= 85) {
      archKey = 'entitysParamour';
      badgeColor = 'from-pink-500 via-rose-600 to-purple-950';
      borderColor = 'border-pink-500/60';
      glowColor = 'rgba(255, 0, 85, 0.35)';
      archIcon = <Heart className="h-6 w-6 text-rose-300 fill-rose-300" />;
    } else if (smashRate <= 20) {
      archKey = 'coldHeartedPragmatist';
      badgeColor = 'from-slate-600 via-zinc-800 to-black';
      borderColor = 'border-slate-500/60';
      glowColor = 'rgba(100, 116, 139, 0.35)';
      archIcon = <Zap className="h-6 w-6 text-slate-300" />;
    }

    const arch = rawArchetypes[archKey] || {};
    const title = arch.title || 'Fog Romantic';
    const subtitle = arch.subtitle || 'A balanced lover drawn to the thrill and warmth of the realm.';
    const description = arch.desc || 'You find equal passion in heart-pounding killer chases and intimate campfire bonds.';

    return {
      title,
      subtitle,
      description,
      badgeColor,
      borderColor,
      glowColor,
      icon: archIcon,
      killerAffinity,
      survivorAffinity,
      smashRate,
      favoriteChar: smashes[0]?.character || null,
    };
  }, [votes, rawSmash]);

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({
          title: `${rawSmash?.modals?.personaTitle || 'Trial Romance Archetype'}: ${persona.title}`,
          text: `"${persona.title}" (${persona.smashRate}% Smash Rate) in Dead by Daylight Smash or Pass!`,
          url: window.location.href,
        })
        .catch(() => {});
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(
        `"${persona.title}" (${persona.smashRate}% Smash Rate) - ${window.location.href}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const personaModalTitle = rawSmash?.modals?.personaTitle || 'Trial Romance Archetype';
  const survivorsLabel = rawSmash?.filters?.survivors || 'Survivors';
  const killersLabel = rawSmash?.filters?.killers || 'Killers';
  const datingPsychologyLabel = rawSmash?.datingPsychology || 'Dating Psychology Breakdown';
  const totalEvaluatedLabel = rawSmash?.totalEvaluated || 'Total Evaluated:';
  const candidatesLabel = rawSmash?.candidates || rawSmash?.candidatesWord || 'candidates';
  const copiedToClipboardLabel = rawSmash?.copiedToClipboard || 'Copied to Clipboard!';
  const shareArchetypeLabel = rawSmash?.shareArchetype || 'Share Archetype';
  const resetVotesLabel = rawSmash?.tooltips?.resetAllVotes || 'Reset All Votes';
  const percentSign = rawSmash?.percentSign || '%';
  const smashRateLabel = rawSmash?.statsDetail?.smashRate || 'Smash Rate';
  const firstSmashLabel = rawSmash?.statsDetail?.firstSmash || 'First Smash';
  const startVotingLabel = rawSmash?.startVoting || 'Start Rating Candidates';

  const hasVotes = votes.length > 0;

  const favoriteCharAvatar = persona.favoriteChar
    ? persona.favoriteChar.media_url?.startsWith('http') || persona.favoriteChar.media_url?.startsWith('/static')
      ? `${persona.favoriteChar.media_url.startsWith('http') ? '' : backendBase}${persona.favoriteChar.media_url}`
      : resolveAvatarUrl(
          backendBase,
          {
            name: persona.favoriteChar.name,
            category: persona.favoriteChar.role,
            avatar_local_path: `avatars/${persona.favoriteChar.role === 'Survivor' ? 'survivors' : 'killers'}/${persona.favoriteChar.slug}.png`,
          },
          persona.favoriteChar.role === 'Survivor'
        )
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={personaModalTitle}
      icon={<Sparkles className="h-6 w-6 text-pink-400" />}
      centerTitle={true}
      ariaLabel={personaModalTitle}
    >
      <div className="p-4 sm:p-6 space-y-5">
        {!hasVotes ? (
          /* Sleek, Non-Repetitive Empty State (Untapped Soul) */
          <div className="flex flex-col items-center justify-center text-center p-6 sm:p-8 rounded-3xl bg-zinc-950/90 border border-zinc-800 space-y-4 shadow-inner">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-900 border border-zinc-700/80 text-pink-400 shadow-[0_0_25px_rgba(255,0,85,0.25)]">
              <Compass className="h-8 w-8 text-pink-400" />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-xl sm:text-2xl font-black font-mono text-zinc-100">
                {persona.title}
              </h3>
              <p className="text-xs text-pink-300/90 font-mono">
                {persona.subtitle}
              </p>
              <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed pt-1">
                {persona.description}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-2 flex items-center gap-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-[#ff0055] hover:from-rose-500 hover:to-pink-500 text-white font-black font-mono text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(255,0,85,0.4)] cursor-pointer active:scale-98"
            >
              <span>{startVotingLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* Unlocked Archetype View */
          <>
            {/* Thematic Hero Banner */}
            <div
              className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br ${persona.badgeColor} border-2 ${persona.borderColor} text-white shadow-2xl transition-all`}
              style={{ boxShadow: `0 0 40px ${persona.glowColor}` }}
            >
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white drop-shadow-md">
                    {persona.title}
                  </h3>
                  {persona.subtitle && (
                    <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-sans font-medium">
                      {persona.subtitle}
                    </p>
                  )}
                </div>

                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-black/40 border border-white/20 backdrop-blur-md shrink-0 shadow-lg">
                  {persona.icon}
                </div>
              </div>
            </div>

            {/* Dating Psychology Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2 shadow-inner">
              <span className="font-bold text-pink-400 uppercase tracking-wider text-[11px] font-mono flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {datingPsychologyLabel}
              </span>
              <p className="text-zinc-300 leading-relaxed text-xs sm:text-sm font-sans">
                {persona.description}
              </p>
            </div>

            {/* Telemetry Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between gap-1 shadow-inner">
                <span className="text-zinc-400 text-[11px]">{totalEvaluatedLabel}</span>
                <span className="text-lg font-black text-zinc-100">
                  {votes.length} <span className="text-xs font-normal text-zinc-400">{candidatesLabel}</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between gap-1 shadow-inner">
                <span className="text-zinc-400 text-[11px]">{smashRateLabel}</span>
                <span className="text-lg font-black text-rose-400 flex items-center gap-1">
                  <Heart className="h-4 w-4 fill-rose-400" />
                  {persona.smashRate}{percentSign}
                </span>
              </div>

              {persona.favoriteChar && (
                <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3 shadow-inner">
                  {favoriteCharAvatar && (
                    <div className="h-10 w-10 rounded-xl overflow-hidden bg-black border border-pink-500/40 shrink-0">
                      <img src={favoriteCharAvatar} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-zinc-400 text-[10px] block truncate">{firstSmashLabel}</span>
                    <span className="text-xs font-bold text-white font-mono truncate block">
                      {persona.favoriteChar.name}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Role Affinity Scale (Survivor vs Killer) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2.5">
              <div className="flex justify-between items-center text-xs font-bold font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Shield className="h-4 w-4" aria-hidden="true" />
                  <span>{survivorsLabel} ({persona.survivorAffinity}{percentSign})</span>
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <Skull className="h-4 w-4" aria-hidden="true" />
                  <span>{killersLabel} ({persona.killerAffinity}{percentSign})</span>
                </span>
              </div>

              <div
                className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden flex border border-zinc-800 shadow-inner"
                role="progressbar"
                aria-valuenow={persona.survivorAffinity}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  style={{ width: `${persona.survivorAffinity}%` }}
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-700 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                />
                <div
                  style={{ width: `${persona.killerAffinity}%` }}
                  className="h-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-700 shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-[#ff0055] hover:from-rose-500 hover:to-pink-500 text-white font-black font-mono text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(255,0,85,0.4)] cursor-pointer active:scale-98"
              >
                {copied ? <Check className="h-4 w-4 stroke-[3]" /> : <Share2 className="h-4 w-4" />}
                <span>{copied ? copiedToClipboardLabel : shareArchetypeLabel}</span>
              </button>

              {onResetAll && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onResetAll();
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-pink-500 text-zinc-400 hover:text-white transition-all cursor-pointer shrink-0 shadow-md"
                  title={resetVotesLabel}
                  aria-label={resetVotesLabel}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};