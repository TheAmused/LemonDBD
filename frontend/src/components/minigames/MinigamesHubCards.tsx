'use client';
// frontend/src/components/minigames/MinigamesHubCards.tsx
//
// The cards the minigames hub renders: the three flagship modes, the standalone guessers, and one
// card per custom trial. Split out of MinigamesHub so the hub only wires state to them.
import React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Play, Share2, Download, Trash2, Check } from 'lucide-react';
import { Button, buttonClassName } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { InfoChip } from '@/components/common/InfoChip';
import { NsfwBadge } from '@/components/common/NsfwBadge';
import { Surface } from '@/components/common/Surface';
import { tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';
import type { ChallengeDefinition } from '@/types/minigame';
import { cn } from '@/utils/cn';
import { formatMessage } from '@/utils/i18nFormat';

type ButtonVariant = Parameters<typeof buttonClassName>[0];
export type CardTone = 'red' | 'amber' | 'green';

// Whole class names (not built from the tone) so Tailwind's scanner sees every one.
const TONE_CLASSES: Record<CardTone, { hover: string; icon: string; glow: string }> = {
  red: {
    hover: 'hover:border-accent-red/60',
    icon: 'bg-accent-red/10 border border-accent-red/30 text-accent-red',
    glow: 'bg-accent-red/5',
  },
  amber: {
    hover: 'hover:border-accent-amber/60',
    icon: 'bg-accent-amber/10 border border-accent-amber/30 text-accent-amber',
    glow: 'bg-accent-amber/5',
  },
  green: {
    hover: 'hover:border-accent-green/60',
    icon: 'bg-accent-green/10 border border-accent-green/30 text-accent-green',
    glow: 'bg-accent-green/5',
  },
};

interface ModeCardProps {
  tone: CardTone;
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  cta: string;
  button: ButtonVariant;
}

/** A large card for one of the hub's three flagship modes. */
export const FlagshipCard: React.FC<ModeCardProps & { badge: string; ctaIcon?: LucideIcon }> = ({
  tone, icon: Icon, badge, title, description, href, cta, button, ctaIcon: CtaIcon,
}) => {
  const classes = TONE_CLASSES[tone];
  return (
    <Surface padding="none" className={cn('p-6 shadow-xl flex flex-col justify-between transition-all group relative overflow-hidden', classes.hover)}>
      <div className={cn('absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none', classes.glow)} />
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className={cn('w-12 h-12 rounded-card flex items-center justify-center group-hover:scale-110 transition-transform', classes.icon)}>
            <Icon className="w-6 h-6" />
          </div>
          <Badge tone={tone} size="sm">
            {badge}
          </Badge>
        </div>
        <h2 className="text-xl font-black text-text-primary mb-1.5">{title}</h2>
        <p className="type-body text-text-secondary">{description}</p>
      </div>
      <Link href={href} className={buttonClassName(button, 'md', 'mt-6 w-full')}>
        {CtaIcon ? <CtaIcon className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
        <span>{cta}</span>
      </Link>
    </Surface>
  );
};

/** A smaller card for one standalone guesser mode. */
export const GuesserCard: React.FC<ModeCardProps> = ({ tone, icon: Icon, title, description, href, cta, button }) => {
  const classes = TONE_CLASSES[tone];
  return (
    <Surface padding="none" className={cn('p-5 shadow-lg flex flex-col justify-between transition-all group', classes.hover)}>
      <div>
        <div className={cn('w-10 h-10 rounded-card flex items-center justify-center mb-3 group-hover:scale-105 transition-transform', classes.icon)}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-base font-bold text-text-primary mb-1">{title}</h3>
        <p className="type-body text-text-secondary">{description}</p>
      </div>
      <Link href={href} className={buttonClassName(button, 'md', 'mt-5 w-full')}>
        <Play className="w-3.5 h-3.5 fill-current" />
        <span>{cta}</span>
      </Link>
    </Surface>
  );
};

interface CustomTrialCardProps {
  trial: ChallengeDefinition;
  locale: string;
  showNsfw: boolean;
  onRevealNsfw: () => void;
  isShareLoading: boolean;
  isCopied: boolean;
  onShare: () => void;
  onExport: () => void;
  onDelete: () => void;
}

/** One of the player's own trials, with play / share / export / delete. */
export const CustomTrialCard: React.FC<CustomTrialCardProps> = ({
  trial, locale, showNsfw, onRevealNsfw, isShareLoading, isCopied, onShare, onExport, onDelete,
}) => {
  const dict = useDictionary();
  const t = dict.minigames;
  const hidden = trial.is_nsfw && !showNsfw;
  return (
    <Surface padding="none" className="p-5 shadow-lg flex flex-col justify-between hover:border-border-color transition-all">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-text-primary text-base truncate">{trial.title}</h3>
          <InfoChip>{formatMessage(t.roundsCount, { count: trial.rounds.length }, locale)}</InfoChip>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          {trial.is_nsfw && <NsfwBadge label={t.nsfw.badge} />}
          {hidden && (
            <Button type="button" variant="secondary" size="xs" onClick={onRevealNsfw}>
              {dict.tierLists.nsfw.reveal}
            </Button>
          )}
        </div>
        {trial.description && (
          <p className={cn('text-xs text-text-secondary mt-1 line-clamp-2', hidden && 'blur-xs select-none')}>
            {trial.description}
          </p>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-border-color flex items-center justify-between gap-2">
        <Link
          href={`/${locale}/minigames/play?id=${encodeURIComponent(String(trial.id))}`}
          className={buttonClassName('success', 'sm')}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{t.playTrial}</span>
        </Link>

        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" icon onClick={onShare} disabled={isShareLoading}
            {...tip(t.shareTrial, undefined, 'action')} aria-label={t.shareTrial}
          >
            {isCopied ? <Check className="w-4 h-4 text-accent-green" /> : <Share2 className="w-4 h-4" />}
          </Button>
          <Button variant="secondary" size="sm" icon onClick={onExport}
            {...tip(t.exportJson, undefined, 'action')} aria-label={t.exportJson}
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="danger" size="sm" icon onClick={onDelete}
            {...tip(t.deleteTrial, undefined, 'action')} aria-label={t.deleteTrial}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Surface>
  );
};
