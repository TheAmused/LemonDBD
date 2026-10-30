'use client';
// frontend/src/components/smash-or-pass/persona/PersonaBreakdown.tsx
import { Compass, RotateCcw, Share2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Surface } from '@/components/common/Surface';
import { tip } from '@/components/common/Tooltip';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import { HeartIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import { isSurvivor } from '@/utils/characterUtils';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { sanitizeImageUrl } from '@/utils/smashOrPass/codec';
import type { RomancePersonaResult } from '@/utils/smashPersona';
import { PersonaIcon } from './PersonaIcon';
import { Badge } from '@/components/common/Badge';
import { Img } from '@/components/common/Img';

interface PersonaBreakdownProps {
  persona: RomancePersonaResult;
  /** A persona opened from someone's share link, rather than the viewer's own. */
  isSharedView: boolean;
  onShare: () => void;
  onClose: () => void;
  onResetAll?: () => void;
}

/** The persona's result: the badge, the dating-psychology read, the numbers, and the role affinity bar. */
export function PersonaBreakdown({ persona, isSharedView, onShare, onClose, onResetAll }: PersonaBreakdownProps) {
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

  const safeBadgeUrl = persona.badgeImageUrl ? sanitizeImageUrl(persona.badgeImageUrl) : null;

  return (
    <>
      {/* Trial Archetype Plaque */}
      <div
        className="archetype-plaque relative overflow-hidden rounded-card p-4 sm:p-5 bg-gradient-to-br from-bg-elevated via-bg-surface to-bg-primary border border-border-color shadow-xl bg-cover bg-center"
        style={
          safeBadgeUrl
            ? { backgroundImage: `url(${JSON.stringify(safeBadgeUrl)})` }
            : undefined
        }
      >
        {isSharedView && (
          <div className="mb-2.5">
            <Badge tone="overlay" size="xs" plain className="backdrop-blur-md text-text-primary">
              {text.sharedBadge}
            </Badge>
          </div>
        )}

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <span className="type-label-2xs text-accent-red uppercase tracking-wider font-bold block">
              {text.modals.personaTitle}
            </span>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-text-primary">
              {persona.title}
            </h3>
            {persona.subtitle && (
              <p className="text-xs text-text-secondary leading-relaxed font-normal">
                {persona.subtitle}
              </p>
            )}
          </div>

          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-card bg-bg-surface/80 border border-border-color/80 shadow-md shrink-0">
            <PersonaIcon persona={persona} />
          </div>
        </div>
      </div>

      {/* Dating Psychology Card */}
      <Surface padding="none" className="p-4 border-l-2 border-l-accent-red border-border-color/60 space-y-1.5 shadow-xs">
        <span className="type-label-2xs text-accent-red flex items-center gap-1.5 font-bold uppercase tracking-wider">
          {text.datingPsychology}
        </span>
        <p className="text-text-secondary type-body-fluid">
          {persona.description}
        </p>
      </Surface>

      {/* Telemetry Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
        <Surface padding="none" className="p-3.5 border-border-color/60 flex flex-col justify-between gap-1 shadow-xs">
          <span className="text-text-muted type-caption">{text.totalEvaluated}</span>
          <span className="text-lg font-black text-text-primary">
            {persona.totalVotes} <span className="text-xs font-normal text-text-muted">{text.candidates}</span>
          </span>
        </Surface>

        <Surface padding="none" className="p-3.5 border-border-color/60 flex flex-col justify-between gap-1 shadow-xs">
          <span className="text-text-muted type-caption">{text.statsDetail.smashRate}</span>
          <span className="text-lg font-black text-accent-red flex items-center gap-1">
            <HeartIcon className="icon-md fill-accent-red" />
            {persona.smashRate}{text.percentSign}
          </span>
        </Surface>

        {persona.favoriteChar && (
          <Surface padding="none" className="col-span-2 sm:col-span-1 p-3.5 border-border-color/60 flex items-center gap-3 shadow-xs">
            {favoriteCharAvatar && (
              <div className="h-10 w-10 rounded-chip overflow-hidden bg-bg-primary border border-accent-red/40 shrink-0">
                <Img src={favoriteCharAvatar} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-text-muted type-micro block truncate">{text.statsDetail.firstSmash}</span>
              <span className="type-strong text-text-primary truncate block">
                {persona.favoriteChar.name}
              </span>
            </div>
          </Surface>
        )}
      </div>

      {/* Role Affinity Scale (Survivor vs Killer) */}
      <Surface padding="none" className="p-4 border-border-color/60 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between pb-1 border-b border-border-color/40">
          <span className="type-label-xs text-text-secondary flex items-center gap-1.5">
            <Compass className="icon-sm text-accent-red" />
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
            <span>
              {text.filters.survivors}
              {persona.smashedSurvivors !== undefined ? ` (${persona.smashedSurvivors})` : ''} ({persona.survivorAffinity}{text.percentSign})
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-accent-red">
            <span>
              {text.filters.killers}
              {persona.smashedKillers !== undefined ? ` (${persona.smashedKillers})` : ''} ({persona.killerAffinity}{text.percentSign})
            </span>
          </span>
        </div>

        <div
          className="h-2.5 w-full bg-bg-elevated rounded-full overflow-hidden flex border border-border-color/60 shadow-inner"
          // The survivor / killer split drawn as a bar; both percentages are in the text above it.
          aria-hidden="true"
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
              className="flex-1"
            >
              <span>{text.playToDiscover}</span>
            </Button>
        ) : (
          <>
            <Button
              variant="primary" size="md"
              onClick={onShare}
              className="flex-1"
            >
              <Share2 />
              <span>{text.shareArchetype}</span>
            </Button>

            {onResetAll && (
              <Button
                variant="secondary" size="lg" icon
                onClick={() => {
                  onClose();
                  onResetAll();
                }}
               
                {...tip(text.tooltips.resetAllVotes, undefined, 'action')}
                aria-label={text.tooltips.resetAllVotes}
              >
                <RotateCcw aria-hidden="true" />
              </Button>
            )}
          </>
        )}
      </div>
    </>
  );
}
