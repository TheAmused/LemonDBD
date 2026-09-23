'use client';
// frontend/src/components/smash-or-pass/RomancePersonaModal.tsx

import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Share2,
  Check,
  RotateCcw,
  Heart,
  Compass,
  ArrowRight,
  ArrowLeft,
  Copy,
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
  buildTelegramShareUrl,
  buildFacebookShareUrl,
  copyTextWithFallback,
  type VoteRecord,
  type SharedArchetypePayload,
  type RomancePersonaResult,
} from '@/utils/smashPersona';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { VeiledCompassIcon, EntityMarkIcon, RedStainIcon, CampfireIcon, EntityHeartIcon, SkillCheckGaugeIcon, FogDriftIcon } from '@/components/icons/DbdIcons';

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
  const [isSharingView, setIsSharingView] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const backendBase = getBackendBaseUrl();
  const rawSmash = dict?.smashOrPass;

  // Reset sharing view and notices when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setIsSharingView(false);
      setCopiedLink(false);
      setFeedbackNotice(null);
    }
  }, [isOpen]);

  const showFeedbackNotice = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => {
      setFeedbackNotice((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  const persona: RomancePersonaResult = useMemo(() => {
    const rawArchetypes = (rawSmash?.personaArchetypes || {}) as Record<string, PersonaArchetypeEntry>;
    if (sharedPayload) {
      return reconstructSharedPersona(sharedPayload, rawArchetypes);
    }
    return calculateRomancePersona(votes, rawArchetypes);
  }, [votes, sharedPayload, rawSmash]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return buildArchetypeShareUrl(window.location.href, {
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
  }, [persona]);

  const shareTitle = `${rawSmash?.modals?.personaTitle || 'Trial Romance Archetype'}: ${persona.title}`;
  const shareText = `"${persona.title}" (${persona.smashRate}% Smash Rate) in Dead by Daylight Smash or Pass!`;

  const handleCopyLinkOnly = async () => {
    const success = await copyTextWithFallback(shareUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const socialLinks = useMemo(() => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);
    const encodedTitle = encodeURIComponent(shareTitle);
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    return [
      {
        name: 'X / Twitter',
        color: 'hover:border-text-primary hover:bg-bg-surface text-text-primary',
        url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        icon: (
          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        ),
      },
      {
        name: 'Reddit',
        color: 'hover:border-[#ff4500] hover:bg-[#ff4500]/10 text-[#ff4500]',
        url: `https://www.reddit.com/submit?title=${encodedTitle}&url=${encodedUrl}`,
        icon: (
          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
          </svg>
        ),
      },
      {
        name: 'WhatsApp',
        color: 'hover:border-[#25D366] hover:bg-[#25D366]/10 text-[#25D366]',
        url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
        icon: (
          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
        ),
      },
      {
        name: 'Telegram',
        color: 'hover:border-[#229ED9] hover:bg-[#229ED9]/10 text-[#229ED9]',
        url: buildTelegramShareUrl(shareUrl, shareText, isMobile),
        onClick: async () => {
          await copyTextWithFallback(`${shareText} - ${shareUrl}`);
          showFeedbackNotice(
            rawSmash?.sharing?.telegramNotice ||
              (locale === 'pl'
                ? 'Otwarto Telegram! Treść wiadomości skopiowano do schowka.'
                : 'Telegram opened! Message text copied to clipboard.')
          );
        },
        icon: (
          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.729-1.748 7.375-2.541 10.725-.335 1.419-.949 1.666-1.545 1.121-.926-.848-2.617-2.025-3.568-2.736-.37-.277-.887-.783.056-1.298 1.082-.591 2.379-2.228 3.528-3.329.418-.4 1.157-1.488-.139-1.233-1.603.315-4.475 2.249-5.184 2.72-.647.43-1.232.55-1.758.388-.58-.179-1.579-.504-2.352-.756-.949-.31-.837-.887.202-1.291 4.062-1.583 6.772-2.627 8.131-3.131 3.864-1.432 4.667-1.681 5.19-1.689.115-.002.373.027.54.164.14.116.179.273.197.384.019.114.016.364.011.459z" />
          </svg>
        ),
      },
      {
        name: 'Facebook',
        color: 'hover:border-[#1877F2] hover:bg-[#1877F2]/10 text-[#1877F2]',
        url: buildFacebookShareUrl(shareUrl, shareText),
        onClick: async () => {
          await copyTextWithFallback(`${shareText} ${shareUrl}`);
          showFeedbackNotice(
            rawSmash?.sharing?.facebookNotice ||
              (locale === 'pl'
                ? 'Otwarto Facebooka! Treść posta skopiowano do schowka (wklej za pomocą Ctrl+V).'
                : 'Facebook opened! Post text copied to clipboard (paste with Ctrl+V).')
          );
        },
        icon: (
          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        ),
      },
      {
        name: 'Discord',
        color: 'hover:border-[#5865F2] hover:bg-[#5865F2]/10 text-[#5865F2]',
        url: '#',
        onClick: async (e: React.MouseEvent) => {
          e.preventDefault();
          await copyTextWithFallback(`${shareText} - ${shareUrl}`);
          showFeedbackNotice(
            rawSmash?.sharing?.copiedForDiscord ||
              (locale === 'pl'
                ? 'Skopiowano treść z linkiem dla Discorda!'
                : 'Copied quote & link for Discord!')
          );
        },
        icon: (
          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
        ),
      },
    ];
  }, [shareUrl, shareText, shareTitle, rawSmash, locale]);

  const handleShare = async () => {
    if (typeof window === 'undefined') return;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        // Dismissed by user (Cancel clicked in native share) -> do nothing
        if (err?.name === 'AbortError') {
          return;
        }
      }
    }

    // Browsers without Web Share API (desktop Firefox, Linux, etc.)
    // Switch dynamically inside this EXACT SAME modal:
    setIsSharingView(true);
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
        return <VeiledCompassIcon className="h-6 w-6 text-text-inverted animate-spin-slow" />;
      case 'skull':
        return <EntityMarkIcon className="h-6 w-6 text-text-inverted" />;
      case 'flame':
        return <RedStainIcon className="h-6 w-6 text-text-inverted" />;
      case 'shield':
        return <CampfireIcon className="h-6 w-6 text-text-inverted" />;
      case 'heart':
        return <EntityHeartIcon className="h-6 w-6 text-text-inverted fill-text-inverted" />;
      case 'zap':
        return <SkillCheckGaugeIcon className="h-6 w-6 text-text-inverted" />;
      case 'sparkles':
      default:
        return <FogDriftIcon className="h-6 w-6 text-text-inverted" />;
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
      onClose={() => {
        setIsSharingView(false);
        onClose();
      }}
      size="xl"
      title={
        isSharingView
          ? rawSmash?.shareArchetype || (locale === 'pl' ? 'Udostępnij Swój Archetyp' : 'Share Your Archetype')
          : personaModalTitle
      }
      icon={
        isSharingView ? (
          <Share2 className="h-6 w-6 text-accent-red" />
        ) : (
          <Sparkles className="h-6 w-6 text-accent-red" />
        )
      }
      centerTitle={!isSharingView}
      headerLeft={
        isSharingView ? (
          <button
            type="button"
            onClick={() => setIsSharingView(false)}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-bg-surface hover:bg-bg-elevated border border-border-color text-text-muted hover:text-text-primary transition-all cursor-pointer"
            title={rawSmash?.sharing?.backToBreakdownTitle || 'Back to breakdown'}
            aria-label={rawSmash?.sharing?.backAriaLabel || 'Back'}
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-accent-red" />
          </button>
        ) : null
      }
      ariaLabel={isSharingView ? 'Share Archetype' : personaModalTitle}
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
              className="mt-2 flex items-center gap-2 py-3 px-6 rounded-2xl bg-accent-red hover:bg-accent-red-hover text-text-inverted font-black font-mono text-xs sm:text-sm transition-all cursor-pointer active:scale-98"
            >
              <span>{startVotingLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : isSharingView ? (
          /* DYNAMIC INLINE SHARE VIEW (DIRECTLY IN THIS SAME MODAL - NO SECOND MODAL) */
          <div className="space-y-4">
            {/* Identity Preview Card */}
            <div
              className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${persona.badgeColor} border-2 ${persona.borderColor} text-text-inverted shadow-lg`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-inverted/75 block">
                    {rawSmash?.modals?.personaTitle || 'Trial Romance Archetype'}
                  </span>
                  <h4 className="text-xl sm:text-2xl font-black font-mono tracking-tight truncate text-text-inverted">
                    {persona.title}
                  </h4>
                  {persona.subtitle && (
                    <p className="text-xs text-text-inverted/85 line-clamp-1 mt-0.5 font-sans font-medium">
                      {persona.subtitle}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-primary/40 border border-border-color backdrop-blur-md shrink-0">
                  <Heart className="h-3.5 w-3.5 fill-accent-red text-accent-red" />
                  <span className="text-xs font-black font-mono text-text-inverted">
                    {persona.smashRate}%
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-[11px] font-mono text-text-inverted/85">
                <span className="flex items-center gap-1.5">
                  <SurvivorIcon className="h-3.5 w-3.5 text-accent-green" />
                  <span>{survivorsLabel} {persona.survivorAffinity}%</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <KillerIcon className="h-3.5 w-3.5 text-accent-red" />
                  <span>{killersLabel} {persona.killerAffinity}%</span>
                </span>
              </div>
            </div>

            {/* Social Media Direct Share Grid */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold flex items-center gap-1.5">
                <Share2 className="h-3 w-3 text-accent-red" />
                {rawSmash?.sharing?.shareDirectly || 'Share Directly'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
                {socialLinks.map((item) => (
                  <a
                    key={item.name}
                    href={item.url}
                    onClick={item.onClick}
                    target={item.url.startsWith('http') ? '_blank' : undefined}
                    rel={item.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-bg-elevated border border-border-color transition-all duration-150 cursor-pointer font-bold ${item.color}`}
                  >
                    {item.icon}
                    <span className="truncate">{item.name}</span>
                  </a>
                ))}
              </div>

              {/* Status / Feedback Banner (for Facebook, Telegram, Discord, etc.) */}
              {feedbackNotice && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-accent-red/10 border border-accent-red/30 text-accent-red text-xs font-mono animate-fadeIn">
                  <Check className="h-4 w-4 shrink-0 stroke-[3]" />
                  <span className="leading-snug">{feedbackNotice}</span>
                </div>
              )}
            </div>

            {/* Direct Link Copy (Single Canonical Copy Button) */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold">
                {rawSmash?.sharing?.directLink || 'Direct Link to Archetype'}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-bg-elevated border border-border-color text-xs font-mono text-text-secondary focus:outline-none focus:border-accent-red select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLinkOnly}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent-red hover:bg-accent-red-hover text-text-inverted text-xs font-mono font-bold transition-all cursor-pointer shrink-0 active:scale-95"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedLink ? (rawSmash?.sharing?.copied || 'Copied!') : (rawSmash?.sharing?.copyLink || 'Copy Link')}</span>
                </button>
              </div>
            </div>

            {/* Return to Breakdown Action */}
            <div className="pt-2 border-t border-border-color">
              <button
                type="button"
                onClick={() => setIsSharingView(false)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-bg-surface hover:bg-bg-elevated border border-border-color text-text-primary font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-98"
              >
                <ArrowLeft className="h-4 w-4 text-accent-red" />
                <span>{rawSmash?.sharing?.backToBreakdown || 'Back to Archetype Breakdown'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Unlocked / Shared Archetype View */
          <>
            <div
              className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br ${persona.badgeColor} border-2 ${persona.borderColor} text-text-inverted shadow-2xl transition-all`}
              style={{ boxShadow: `0 0 40px ${persona.glowColor}` }}
            >
              {isSharedView && (
                <div className="mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-primary/50 border border-border-color text-[11px] font-mono font-bold tracking-wider text-text-inverted backdrop-blur-md shadow-sm">
                    <Sparkles className="h-3 w-3 text-text-inverted" />
                    {sharedResultBadge}
                  </span>
                </div>
              )}

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-text-inverted drop-shadow-md">
                    {persona.title}
                  </h3>
                  {persona.subtitle && (
                    <p className="text-xs sm:text-sm text-text-inverted/90 leading-relaxed font-sans font-medium">
                      {persona.subtitle}
                    </p>
                  )}
                </div>

                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-bg-primary/40 border border-border-color backdrop-blur-md shrink-0 shadow-lg">
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
                  <SurvivorIcon className="h-4 w-4" aria-hidden="true" />
                  <span>{survivorsLabel} ({persona.survivorAffinity}{percentSign})</span>
                </span>
                <span className="flex items-center gap-1.5 text-accent-red">
                  <KillerIcon className="h-4 w-4" aria-hidden="true" />
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
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-accent-red hover:bg-accent-red-hover text-text-inverted font-black font-mono text-xs sm:text-sm transition-all cursor-pointer active:scale-98"
                  >
                    <Gamepad2 className="h-4 w-4" />
                    <span>{playToDiscoverLabel}</span>
                  </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-accent-red hover:bg-accent-red-hover text-text-inverted font-black font-mono text-xs sm:text-sm transition-all cursor-pointer active:scale-98"
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