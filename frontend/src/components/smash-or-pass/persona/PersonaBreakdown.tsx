'use client';
// frontend/src/components/smash-or-pass/persona/PersonaBreakdown.tsx
import { Check, Compass, Gamepad2, Heart, RotateCcw, Share2, Sparkles } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Surface } from '@/components/common/Surface';
import { tip } from '@/components/common/Tooltip';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import { isSurvivor } from '@/utils/characterUtils';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import type { RomancePersonaResult } from '@/utils/smashPersona';
import { PersonaIcon } from './PersonaIcon';

interface PersonaBreakdownProps {
  persona: RomancePersonaResult;
  /** A persona opened from someone's share link, rather than the viewer's own. */
  isSharedView: boolean;
  copied: boolean;
  onShare: () => void;
  onClose: () => void;
  onResetAll?: () => void;
}

/** The persona's result: the badge, the dating-psychology read, the numbers, and the role affinity bar. */
export function PersonaBreakdown({ persona, isSharedView, copied, onShare, onClose, onResetAll }: PersonaBreakdownProps) {
  const dict = useDictionary();
  const text = dict.smashOrPass;
  const backendBase = getBackendBaseUrl();

  const favoriteCharAvatar = persona.favoriteChar
    ? persona.favoriteChar.media_url?.startsWith('http') || persona.favoriteChar.media_url?.startsWith('/static')
      ? `${persona.favoriteChar.media_url.startsWith('http') ? '' : backendBase}${persona.favoriteChar.media_url}`
      : resolveAvatarUrl(
          backendBase,
          {
            name: persona.favoriteChar.name,
            category: isSurvivor(persona.favoriteChar.role) ? 'Survivor' : 'Killer',
            avatar_local_path: `avatars/${isSurvivor(persona.favoriteChar.role) ? 'survivors' : 'killers'}/${persona.favoriteChar.slug || 'unknown'}.png`,
          },
          isSurvivor(persona.favoriteChar.role)
        )
    : null;

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br ${persona.badgeColor} border-2 ${persona.borderColor} text-text-inverted shadow-2xl transition-all`}
        style={{
          boxShadow: `0 0 40px ${persona.glowColor}`,
          backgroundImage: persona.badgeImageUrl ? `url(${persona.badgeImageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {isSharedView && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-primary/50 border border-border-color text-mini font-bold tracking-wider text-text-inverted backdrop-blur-md shadow-sm">
              <Sparkles className="h-3 w-3 text-text-inverted" />
              {text.sharedBadge}
            </span>
          </div>
        )}

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-text-inverted drop-shadow-md">
              {persona.title}
            </h3>
            {persona.subtitle && (
              <p className="text-xs sm:text-sm text-text-inverted/90 leading-relaxed font-medium">
                {persona.subtitle}
              </p>
            )}
          </div>

          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-bg-primary/40 border border-border-color backdrop-blur-md shrink-0 shadow-lg">
            <PersonaIcon persona={persona} />
          </div>
        </div>
      </div>

      {/* Dating Psychology Card */}
      <Surface tone="elevated" radius="2xl" padding="none" className="p-4 sm:p-5 space-y-2 shadow-inner">
        <span className="type-label-xs text-accent-red flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {text.datingPsychology}
        </span>
        <p className="text-text-secondary type-body-fluid">
          {persona.description}
        </p>
      </Surface>

      {/* Telemetry Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-bg-surface border border-border-color flex flex-col justify-between gap-1 shadow-inner">
          <span className="text-text-muted type-caption">{text.totalEvaluated}</span>
          <span className="text-lg font-black text-text-primary">
            {persona.totalVotes} <span className="text-xs font-normal text-text-muted">{text.candidates}</span>
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-bg-surface border border-border-color flex flex-col justify-between gap-1 shadow-inner">
          <span className="text-text-muted type-caption">{text.statsDetail.smashRate}</span>
          <span className="text-lg font-black text-accent-red flex items-center gap-1">
            <Heart className="h-4 w-4 fill-accent-red" />
            {persona.smashRate}{text.percentSign}
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
              <span className="text-text-muted type-micro block truncate">{text.statsDetail.firstSmash}</span>
              <span className="type-strong text-text-primary truncate block">
                {persona.favoriteChar.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Role Affinity Scale (Survivor vs Killer) */}
      <Surface tone="elevated" radius="2xl" padding="none" className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-0.5 border-b border-border-color/40">
          <span className="type-label-xs text-text-secondary flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-accent-red" />
            {text.roleAffinity}
          </span>
          {persona.totalSmashes !== undefined && (
            <span className="type-micro text-text-muted">
              {persona.totalSmashes > 0
                ? `${persona.totalSmashes} ${text.statsDetail.smashCount}`
                : text.noSmashesRecorded}
            </span>
          )}
        </div>

        <div className="flex justify-between items-center type-strong">
          <span className="flex items-center gap-1.5 text-accent-green">
            <SurvivorIcon className="h-4 w-4" aria-hidden="true" />
            <span>
              {text.filters.survivors}
              {persona.smashedSurvivors !== undefined ? ` (${persona.smashedSurvivors})` : ''} ({persona.survivorAffinity}{text.percentSign})
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-accent-red">
            <KillerIcon className="h-4 w-4" aria-hidden="true" />
            <span>
              {text.filters.killers}
              {persona.smashedKillers !== undefined ? ` (${persona.smashedKillers})` : ''} ({persona.killerAffinity}{text.percentSign})
            </span>
          </span>
        </div>

        <div
          className="h-3 w-full bg-bg-surface rounded-full overflow-hidden flex border border-border-color shadow-inner"
          role="progressbar"
          aria-valuenow={persona.survivorAffinity}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {persona.survivorAffinity === 0 && persona.killerAffinity === 0 ? (
            <div className="h-full w-full bg-bg-surface" />
          ) : (
            <>
              <div
                style={{ width: `${persona.survivorAffinity}%` }}
                className="h-full bg-accent-green transition-all duration-700"
              />
              <div
                style={{ width: `${persona.killerAffinity}%` }}
                className="h-full bg-accent-red transition-all duration-700"
              />
            </>
          )}
        </div>
      </Surface>

      {/* Bottom Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        {isSharedView ? (
            <Button
              variant="primary" size="md"
              onClick={onClose}
              className="flex-1 rounded-2xl"
            >
              <Gamepad2 className="h-4 w-4" />
              <span>{text.playToDiscover}</span>
            </Button>
        ) : (
          <>
            <Button
              variant="primary" size="md"
              onClick={onShare}
              className="flex-1 rounded-2xl"
            >
              {copied ? <Check className="h-4 w-4 stroke-[3]" /> : <Share2 className="h-4 w-4" />}
              <span>{copied ? text.copiedToClipboard : text.shareArchetype}</span>
            </Button>

            {onResetAll && (
              <Button
                variant="secondary" size="lg" icon
                onClick={() => {
                  onClose();
                  onResetAll();
                }}
                className="rounded-2xl"
                {...tip(text.tooltips.resetAllVotes, undefined, 'action')}
                aria-label={text.tooltips.resetAllVotes}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </>
        )}
      </div>
    </>
  );
}
