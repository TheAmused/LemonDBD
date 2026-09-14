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
  Gamepad2,
} from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { EntityItem } from '@/types/smashOrPass';
import { Modal } from '@/components/common/Modal';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import {
  calculateRomancePersona,
  reconstructSharedPersona,
  buildArchetypeShareUrl,
  copyTextWithFallback,
  type VoteRecord,
  type SharedArchetypePayload,
  type RomancePersonaResult,
} from '@/utils/smashPersona';

interface PersonaArchetypeEntry {
  title?: string;
  subtitle?: string;
  desc?: string;
}

interface RomancePersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  votes: VoteRecord[];
  sharedPayload?: SharedArchetypePayload | null;
  onResetAll?: () => void;
  locale?: string;
  dict?: Dictionary | any;
}

export const RomancePersonaModal: React.FC<RomancePersonaModalProps> = ({
  isOpen,
  onClose,
  votes,
  sharedPayload,
  onResetAll,
  locale = 'en',
  dict,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const backendBase = getBackendBaseUrl();
  const rawSmash = dict?.smashOrPass;

  const persona: RomancePersonaResult = useMemo(() => {
    const rawArchetypes = (rawSmash?.personaArchetypes || {}) as Record<string, PersonaArchetypeEntry>;
    if (sharedPayload) {
      return reconstructSharedPersona(sharedPayload, rawArchetypes);
    }
    return calculateRomancePersona(votes, rawArchetypes);
  }, [votes, sharedPayload, rawSmash]);

  const handleShare = async () => {
    if (typeof window === 'undefined') return;

    const shareUrl = buildArchetypeShareUrl(window.location.href, {
      k: persona.archKey,
      r: persona.smashRate,
      s: persona.survivorAffinity,
      ka: persona.killerAffinity,
      v: persona.totalVotes,
      fn: persona.favoriteChar?.name,
      fs: persona.favoriteChar?.slug,
      fr: persona.favoriteChar?.role,
      fm: persona.favoriteChar?.media_url || undefined,
    });

    const shareTitle = `${rawSmash?.modals?.personaTitle || 'Trial Romance Archetype'}: ${persona.title}`;
    const shareText = `"${persona.title}" (${persona.smashRate}% Smash Rate) in Dead by Daylight Smash or Pass!`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User dismissed native share or not allowed, fallback to clipboard
      }
    }

    const fullShareString = `${shareText} - ${shareUrl}`;
    const success = await copyTextWithFallback(fullShareString);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isSharedView = Boolean(persona.isShared);
  const personaModalTitle = isSharedView
    ? rawSmash?.modals?.sharedPersonaTitle || (locale === 'pl' ? 'Udostępniony Archetyp Randkowy' : 'Shared Romance Archetype')
    : rawSmash?.modals?.personaTitle || 'Trial Romance Archetype';

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
  const playToDiscoverLabel = rawSmash?.playToDiscover || (locale === 'pl' ? 'Zagraj i Odkryj Swój Archetyp!' : 'Play & Discover Yours!');
  const sharedResultBadge = rawSmash?.sharedBadge || (locale === 'pl' ? 'Udostępniony Wynik Znajomego' : "Friend's Shared Result");

  const hasVotes = persona.totalVotes > 0 || isSharedView;

  const renderIcon = (name: RomancePersonaResult['iconName']) => {
    switch (name) {
      case 'compass':
        return <Compass className="h-6 w-6 text-white animate-spin-slow" />;
      case 'skull':
        return <Skull className="h-6 w-6 text-white" />;
      case 'flame':
        return <Flame className="h-6 w-6 text-white" />;
      case 'shield':
        return <Shield className="h-6 w-6 text-white" />;
      case 'heart':
        return <Heart className="h-6 w-6 text-white fill-white" />;
      case 'zap':
        return <Zap className="h-6 w-6 text-white" />;
      case 'sparkles':
      default:
        return <Sparkles className="h-6 w-6 text-white" />;
    }
  };

  const favoriteCharAvatar = persona.favoriteChar
    ? persona.favoriteChar.media_url?.startsWith('http') || persona.favoriteChar.media_url?.startsWith('/static')
      ? `${persona.favoriteChar.media_url.startsWith('http') ? '' : backendBase}${persona.favoriteChar.media_url}`
      : resolveAvatarUrl(
          backendBase,
          {
            name: persona.favoriteChar.name,
            category: (persona.favoriteChar.role || 'Survivor') as any,
            avatar_local_path: `avatars/${persona.favoriteChar.role === 'Survivor' ? 'survivors' : 'killers'}/${persona.favoriteChar.slug || 'unknown'}.png`,
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
      icon={<Sparkles className="h-6 w-6 text-accent-red" />}
      centerTitle={true}
      ariaLabel={personaModalTitle}
    >
      <div className="p-4 sm:p-6 space-y-5">
        {!hasVotes ? (
          /* Sleek, Non-Repetitive Empty State (Untapped Soul) */
          <div className="flex flex-col items-center justify-center text-center p-6 sm:p-8 rounded-3xl bg-bg-elevated border border-border-color space-y-4 shadow-inner">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-bg-surface border border-border-color text-accent-red">
              <Compass className="h-8 w-8 text-accent-red" />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-xl sm:text-2xl font-black font-mono text-text-primary">
                {persona.title}
              </h3>
              <p className="text-xs text-accent-red/80 font-mono">
                {persona.subtitle}
              </p>
              <p className="text-xs sm:text-sm text-text-muted font-sans leading-relaxed pt-1">
                {persona.description}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-2 flex items-center gap-2 py-3 px-6 rounded-2xl bg-accent-red hover:bg-accent-red-hover text-white font-black font-mono text-xs sm:text-sm transition-all cursor-pointer active:scale-98"
            >
              <span>{startVotingLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* Unlocked / Shared Archetype View */
          <>
            <div
              className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br ${persona.badgeColor} border-2 ${persona.borderColor} text-white shadow-2xl transition-all`}
              style={{ boxShadow: `0 0 40px ${persona.glowColor}` }}
            >
              {isSharedView && (
                <div className="mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 border border-white/25 text-[11px] font-mono font-bold tracking-wider text-white backdrop-blur-md shadow-sm">
                    <Sparkles className="h-3 w-3 text-white" />
                    {sharedResultBadge}
                  </span>
                </div>
              )}

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
                  {renderIcon(persona.iconName)}
                </div>
              </div>
            </div>

            {/* Dating Psychology Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-bg-elevated border border-border-color space-y-2 shadow-inner">
              <span className="font-bold text-accent-red uppercase tracking-wider text-[11px] font-mono flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {datingPsychologyLabel}
              </span>
              <p className="text-text-secondary leading-relaxed text-xs sm:text-sm font-sans">
                {persona.description}
              </p>
            </div>

            {/* Telemetry Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-2xl bg-bg-surface border border-border-color flex flex-col justify-between gap-1 shadow-inner">
                <span className="text-text-muted text-[11px]">{totalEvaluatedLabel}</span>
                <span className="text-lg font-black text-text-primary">
                  {persona.totalVotes} <span className="text-xs font-normal text-text-muted">{candidatesLabel}</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-bg-surface border border-border-color flex flex-col justify-between gap-1 shadow-inner">
                <span className="text-text-muted text-[11px]">{smashRateLabel}</span>
                <span className="text-lg font-black text-accent-red flex items-center gap-1">
                  <Heart className="h-4 w-4 fill-accent-red" />
                  {persona.smashRate}{percentSign}
                </span>
              </div>

              {persona.favoriteChar && (
                <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-bg-surface border border-border-color flex items-center gap-3 shadow-inner">
                  {favoriteCharAvatar && (
                    <div className="h-10 w-10 rounded-xl overflow-hidden bg-bg-primary border border-accent-red/40 shrink-0">
                      <img src={favoriteCharAvatar} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-text-muted text-[10px] block truncate">{firstSmashLabel}</span>
                    <span className="text-xs font-bold text-text-primary font-mono truncate block">
                      {persona.favoriteChar.name}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Role Affinity Scale (Survivor vs Killer) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-bg-elevated border border-border-color space-y-2.5">
              <div className="flex justify-between items-center text-xs font-bold font-mono">
                <span className="flex items-center gap-1.5 text-accent-green">
                  <Shield className="h-4 w-4" aria-hidden="true" />
                  <span>{survivorsLabel} ({persona.survivorAffinity}{percentSign})</span>
                </span>
                <span className="flex items-center gap-1.5 text-accent-red">
                  <Skull className="h-4 w-4" aria-hidden="true" />
                  <span>{killersLabel} ({persona.killerAffinity}{percentSign})</span>
                </span>
              </div>

              <div
                className="h-3 w-full bg-bg-elevated rounded-full overflow-hidden flex border border-border-color shadow-inner"
                role="progressbar"
                aria-valuenow={persona.survivorAffinity}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  style={{ width: `${persona.survivorAffinity}%` }}
                  className="h-full bg-accent-green transition-all duration-700"
                />
                <div
                  style={{ width: `${persona.killerAffinity}%` }}
                  className="h-full bg-accent-red transition-all duration-700"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              {isSharedView ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-accent-red hover:bg-accent-red-hover text-white font-black font-mono text-xs sm:text-sm transition-all cursor-pointer active:scale-98"
                  >
                    <Gamepad2 className="h-4 w-4" />
                    <span>{playToDiscoverLabel}</span>
                  </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-accent-red hover:bg-accent-red-hover text-white font-black font-mono text-xs sm:text-sm transition-all cursor-pointer active:scale-98"
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
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-surface border border-border-color hover:bg-bg-elevated hover:border-accent-red text-text-muted hover:text-text-primary transition-all cursor-pointer shrink-0 shadow-md"
                      title={resetVotesLabel}
                      aria-label={resetVotesLabel}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};