'use client';
// frontend/src/components/smash-or-pass/RomancePersonaModal.tsx

import { isAbortError } from '@/utils/api';
import React, { useMemo, useState } from 'react';
import { Sparkles, Share2, Compass, ArrowRight, ArrowLeft } from 'lucide-react';
import type { CustomRomanceArchetype } from '@/types/smashOrPass';
import { Modal } from '@/components/common/Modal';
import {
  calculateRomancePersona,
  reconstructSharedPersona,
  buildArchetypeShareUrl,
  type VoteRecord,
  type SharedArchetypePayload,
  type RomancePersonaResult,
} from '@/utils/smashPersona';

import { tip } from '@/components/common/Tooltip';
import { Button } from '@/components/common/Button';
import { copyTextWithFallback } from '@/utils/clipboard';
import { useDictionary } from "@/context/DictionaryContext";
import { PersonaBreakdown } from './persona/PersonaBreakdown';
import { PersonaShareView } from './persona/PersonaShareView';
import { buildSocialLinks } from './persona/socialLinks';

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
  customArchetypes?: CustomRomanceArchetype[];
}

export const RomancePersonaModal: React.FC<RomancePersonaModalProps> = ({ isOpen, onClose, votes, sharedPayload, onResetAll, locale = 'en', customArchetypes }) => {
  const dict = useDictionary();
  const [copied, setCopied] = useState<boolean>(false);
  const [isSharingView, setIsSharingView] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const rawSmash = dict.smashOrPass;

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
    const rawArchetypes = (rawSmash.personaArchetypes || {}) as Record<string, PersonaArchetypeEntry>;
    if (sharedPayload) {
      return reconstructSharedPersona(sharedPayload, rawArchetypes);
    }
    return calculateRomancePersona(votes, rawArchetypes, customArchetypes);
  }, [votes, sharedPayload, rawSmash, customArchetypes]);

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

  const shareTitle = `${rawSmash.modals.personaTitle}: ${persona.title}`;
  const shareText = `"${persona.title}" (${persona.smashRate}% Smash Rate) in Dead by Daylight Smash or Pass!`;

  const handleCopyLinkOnly = async () => {
    const success = await copyTextWithFallback(shareUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const socialLinks = useMemo(
    () =>
      buildSocialLinks({
        shareUrl,
        shareText,
        shareTitle,
        telegramNotice: rawSmash.sharing.telegramNotice,
        copiedForDiscord: rawSmash.sharing.copiedForDiscord,
        onNotice: showFeedbackNotice,
      }),
    [shareUrl, shareText, shareTitle, rawSmash, locale]
  );

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
      } catch (err) {
        // Dismissed by user (Cancel clicked in native share) -> do nothing
        if (isAbortError(err)) {
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
    ? rawSmash.modals.sharedPersonaTitle
    : rawSmash.modals.personaTitle;

  const hasVotes = persona.totalVotes > 0 || isSharedView;

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
          ? rawSmash.shareArchetype
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
          <Button
            variant="secondary" size="md" icon
            onClick={() => setIsSharingView(false)}
            {...tip(rawSmash.sharing.backToBreakdownTitle, undefined, 'action')}
            aria-label={rawSmash.sharing.backAriaLabel}
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-accent-red" />
          </Button>
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
              <h3 className="type-page-title text-text-primary">
                {persona.title}
              </h3>
              <p className="text-xs text-accent-red/80">
                {persona.subtitle}
              </p>
              <p className="type-body-fluid text-text-muted pt-1">
                {persona.description}
              </p>
            </div>

            <Button
              variant="primary" size="md"
              onClick={onClose}
              className="mt-2 rounded-2xl"
            >
              <span>{rawSmash.startVoting}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : isSharingView ? (
          <PersonaShareView
            persona={persona}
            socialLinks={socialLinks}
            shareUrl={shareUrl}
            feedbackNotice={feedbackNotice}
            copiedLink={copiedLink}
            onCopyLink={handleCopyLinkOnly}
            onBack={() => setIsSharingView(false)}
          />
        ) : (
          <PersonaBreakdown
            persona={persona}
            isSharedView={isSharedView}
            copied={copied}
            onShare={handleShare}
            onClose={onClose}
            onResetAll={onResetAll}
          />
        )}
      </div>
    </Modal>
  );
};
