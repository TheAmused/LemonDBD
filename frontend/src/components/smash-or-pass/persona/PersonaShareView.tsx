'use client';
// frontend/src/components/smash-or-pass/persona/PersonaShareView.tsx
import { ArrowLeft, Check, Copy, Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import type { RomancePersonaResult } from '@/utils/smashPersona';
import type { SocialLink } from './socialLinks';

interface PersonaShareViewProps {
  persona: RomancePersonaResult;
  socialLinks: SocialLink[];
  shareUrl: string;
  feedbackNotice: string | null;
  copiedLink: boolean;
  onCopyLink: () => void;
  onBack: () => void;
}

/** Sharing, inline in the same modal: a preview of the badge, the networks, and the direct link. */
export function PersonaShareView({
  persona,
  socialLinks,
  shareUrl,
  feedbackNotice,
  copiedLink,
  onCopyLink,
  onBack,
}: PersonaShareViewProps) {
  const dict = useDictionary();
  const text = dict.smashOrPass;

  return (
    <div className="space-y-4">
      {/* Identity Preview Card */}
      <div
        className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${persona.badgeColor} border-2 ${persona.borderColor} text-text-inverted shadow-lg`}
        style={{
          backgroundImage: persona.badgeImageUrl ? `url(${persona.badgeImageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-tiny uppercase tracking-widest text-text-inverted/75 block">
              {text.modals.personaTitle}
            </span>
            <h4 className="text-xl sm:text-2xl font-black tracking-tight truncate text-text-inverted">
              {persona.title}
            </h4>
            {persona.subtitle && (
              <p className="text-xs text-text-inverted/85 line-clamp-1 mt-0.5 font-medium">
                {persona.subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-primary/40 border border-border-color backdrop-blur-md shrink-0">
            <Heart className="h-3.5 w-3.5 fill-accent-red text-accent-red" />
            <span className="type-strong text-text-inverted">
              {persona.smashRate}%
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 type-caption text-text-inverted/85">
          <span className="flex items-center gap-1.5">
            <SurvivorIcon className="h-3.5 w-3.5 text-accent-green" />
            <span>{text.filters.survivors} {persona.survivorAffinity}%</span>
          </span>
          <span className="flex items-center gap-1.5">
            <KillerIcon className="h-3.5 w-3.5 text-accent-red" />
            <span>{text.filters.killers} {persona.killerAffinity}%</span>
          </span>
        </div>
      </div>

      {/* Social Media Direct Share Grid */}
      <div className="space-y-2 pt-1">
        <span className="type-label-2xs text-text-muted flex items-center gap-1.5">
          <Share2 className="h-3 w-3 text-accent-red" />
          {text.sharing.shareDirectly}
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
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

        {/* Status / Feedback Banner (for Telegram, Discord, etc.) */}
        {feedbackNotice && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-accent-red/10 border border-accent-red/30 text-accent-red text-xs animate-fadeIn">
            <Check className="h-4 w-4 shrink-0 stroke-[3]" />
            <span className="leading-snug">{feedbackNotice}</span>
          </div>
        )}
      </div>

      {/* Direct Link Copy (Single Canonical Copy Button) */}
      <div className="space-y-2 pt-1">
        <span className="type-label-2xs text-text-muted">
          {text.sharing.directLink}
        </span>
        <div className="flex items-center gap-2">
          <Input
            fieldSize="md"
            type="text"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 sm:text-xs select-all"
          />
          <Button
            variant="primary" size="md"
            onClick={onCopyLink}
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedLink ? (text.sharing.copied) : (text.sharing.copyLink)}</span>
          </Button>
        </div>
      </div>

      {/* Return to Breakdown Action */}
      <div className="pt-2 border-t border-border-color">
        <Button
          variant="secondary" size="md"
          onClick={onBack}
          className="w-full rounded-2xl"
        >
          <ArrowLeft className="h-4 w-4 text-accent-red" />
          <span>{text.sharing.backToBreakdown}</span>
        </Button>
      </div>
    </div>
  );
}
