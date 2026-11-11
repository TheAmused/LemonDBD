'use client';
// frontend/src/components/smash-or-pass/persona/PersonaBreakdown.tsx
import { RotateCcw, Share2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { tip } from '@/components/common/Tooltip';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import { avatarThumbFromPath, getCommunityCoverThumbUrl, getThumbUrl } from '@/utils/thumbUrl';
import { HeartIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import { isSurvivor } from '@/utils/characterUtils';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { sanitizeImageUrl } from '@/utils/smashOrPass/codec';
import type { RomancePersonaResult } from '@/utils/smashPersona';
import { MotionImg } from '@/components/common/MotionImg';

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

  const rawFavoriteCharAvatar = persona.favoriteChar
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

  const favoriteCharAvatar = !rawFavoriteCharAvatar
    ? null
    : rawFavoriteCharAvatar.includes('/static/uploads/community/')
      ? getThumbUrl('community', rawFavoriteCharAvatar, 128, backendBase) || rawFavoriteCharAvatar
      : rawFavoriteCharAvatar.includes('/static/avatars/')
        ? avatarThumbFromPath(rawFavoriteCharAvatar, 128, backendBase) || rawFavoriteCharAvatar
        : getCommunityCoverThumbUrl(rawFavoriteCharAvatar, 256, backendBase) || rawFavoriteCharAvatar;

  const safeBadgeUrl = persona.badgeImageUrl ? sanitizeImageUrl(persona.badgeImageUrl) : null;

  return (
    <div className="flex flex-col divide-y divide-border-color/50 [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
      {/* Archetype: its title and one line. Flat; the modal is the only box. */}
      <section
        className={safeBadgeUrl ? 'relative overflow-hidden rounded-card p-4 bg-cover bg-center' : undefined}
        style={safeBadgeUrl ? { backgroundImage: `url(${JSON.stringify(safeBadgeUrl)})` } : undefined}
      >
        <div className="space-y-1">
          {isSharedView && (
            <span className="type-label-2xs text-text-muted uppercase tracking-wider block">{text.sharedBadge}</span>
          )}
          <span className="type-label-2xs text-accent-red uppercase tracking-wider font-bold block">
            {text.modals.personaTitle}
          </span>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-text-primary">{persona.title}</h3>
          {persona.subtitle && (
            <p className="text-xs text-text-secondary leading-relaxed font-normal">{persona.subtitle}</p>
          )}
        </div>
      </section>

      {/* Dating psychology */}
      <section className="space-y-1.5">
        <span className="type-label-2xs text-accent-red font-bold uppercase tracking-wider block">
          {text.datingPsychology}
        </span>
        <p className="text-text-secondary type-body-fluid">{persona.description}</p>
      </section>

      {/* Numbers: plain figures, set apart by thin rules */}
      <section
        className={`grid ${persona.favoriteChar ? 'grid-cols-3' : 'grid-cols-2'} gap-0 divide-x divide-border-color/50 text-xs [&>*]:px-3 [&>*:first-child]:pl-0 [&>*:last-child]:pr-0`}
      >
        <div className="flex flex-col gap-1">
          <span className="text-text-muted type-caption">{text.totalEvaluated}</span>
          <span className="text-lg font-black text-text-primary">
            {persona.totalVotes} <span className="text-xs font-normal text-text-muted">{text.candidates}</span>
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-text-muted type-caption">{text.statsDetail.smashRate}</span>
          <span className="text-lg font-black text-accent-red flex items-center gap-1">
            <HeartIcon className="icon-md fill-accent-red" />
            {persona.smashRate}{text.percentSign}
          </span>
        </div>

        {persona.favoriteChar && (
          <div className="flex items-center gap-2.5 min-w-0">
            {favoriteCharAvatar && (
              <div className="h-9 w-9 rounded-chip overflow-hidden bg-bg-primary shrink-0">
                <MotionImg src={favoriteCharAvatar} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-text-muted type-micro block truncate">{text.statsDetail.firstSmash}</span>
              <span className="type-strong text-text-primary truncate block">{persona.favoriteChar.name}</span>
            </div>
          </div>
        )}
      </section>

      {/* Role affinity (survivor vs killer) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="type-label-xs text-text-secondary">{text.roleAffinity}</span>
          {persona.totalSmashes !== undefined && (
            <span className="type-micro text-text-muted">
              {persona.totalSmashes > 0
                ? `${persona.totalSmashes} ${text.statsDetail.smashCount}`
                : text.noSmashesRecorded}
            </span>
          )}
        </div>

        <div className="flex justify-between items-center type-strong">
          <span className="text-accent-green">
            {text.filters.survivors}
            {persona.smashedSurvivors !== undefined ? ` (${persona.smashedSurvivors})` : ''} ({persona.survivorAffinity}{text.percentSign})
          </span>
          <span className="text-accent-red">
            {text.filters.killers}
            {persona.smashedKillers !== undefined ? ` (${persona.smashedKillers})` : ''} ({persona.killerAffinity}{text.percentSign})
          </span>
        </div>

        <div
          className="h-2 w-full bg-bg-elevated rounded-full overflow-hidden flex"
          // The survivor / killer split drawn as a bar; both percentages are in the text above it.
          aria-hidden="true"
        >
          {persona.survivorAffinity === 0 && persona.killerAffinity === 0 ? (
            <div className="h-full w-full bg-bg-surface" />
          ) : (
            <>
              <div style={{ width: `${persona.survivorAffinity}%` }} className="h-full bg-accent-green transition-all duration-700" />
              <div style={{ width: `${persona.killerAffinity}%` }} className="h-full bg-accent-red transition-all duration-700" />
            </>
          )}
        </div>
      </section>

      {/* Bottom Actions */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
      </section>
    </div>
  );
}
