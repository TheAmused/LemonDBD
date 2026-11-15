'use client';
// frontend/src/components/smash-or-pass/persona/PersonaBreakdown.tsx
import { RotateCcw, Share2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { tip } from '@/components/common/Tooltip';
import { HeartIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import { sanitizeImageUrl } from '@/utils/smashOrPass/codec';
import type { RomancePersonaResult } from '@/utils/smashPersona';

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
  const safeBadgeUrl = persona.badgeImageUrl ? sanitizeImageUrl(persona.badgeImageUrl) : null;
  const displayTotalSmashes =
    persona.totalSmashes ?? (persona.totalVotes > 0 ? Math.round((persona.smashRate / 100) * persona.totalVotes) : 0);

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
      <section className="grid grid-cols-3 gap-0 divide-x divide-border-color/50 text-xs [&>*]:px-3 [&>*:first-child]:pl-0 [&>*:last-child]:pr-0">
        <div className="flex flex-col gap-1">
          <span className="text-text-muted type-caption">{text.totalEvaluated}</span>
          <span className="text-lg font-black text-text-primary">
            {persona.totalVotes} <span className="text-xs font-normal text-text-muted">{text.candidates}</span>
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-text-muted type-caption">{text.statsDetail.totalSmashes ?? text.statsDetail.smashCount}</span>
          <span className="text-lg font-black text-accent-red flex items-center gap-1">
            <HeartIcon className="icon-md fill-accent-red" />
            {displayTotalSmashes}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-text-muted type-caption">{text.statsDetail.smashRate}</span>
          <span className="text-lg font-black text-text-primary">
            {persona.smashRate}{text.percentSign}
          </span>
        </div>
      </section>

      {/* Role affinity (survivor vs killer) */}
      <section className="space-y-2.5">
        <span className="type-label-xs text-text-secondary block">{text.roleAffinity}</span>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="rounded-card bg-bg-surface/50 border border-border-color/40 p-2.5 flex flex-col gap-0.5">
            <span className="text-accent-green type-caption uppercase font-bold">
              {text.filters.survivors}
            </span>
            <div className="flex items-baseline gap-1.5">
              {persona.smashedSurvivors !== undefined && (
                <span className="text-sm sm:text-base font-black text-text-primary mr-1">
                  {persona.smashedSurvivors}
                </span>
              )}
              <span className="text-xs text-text-muted">
                ({persona.survivorAffinity}{text.percentSign})
              </span>
            </div>
          </div>

          <div className="rounded-card bg-bg-surface/50 border border-border-color/40 p-2.5 flex flex-col gap-0.5">
            <span className="text-accent-red type-caption uppercase font-bold">
              {text.filters.killers}
            </span>
            <div className="flex items-baseline gap-1.5">
              {persona.smashedKillers !== undefined && (
                <span className="text-sm sm:text-base font-black text-text-primary mr-1">
                  {persona.smashedKillers}
                </span>
              )}
              <span className="text-xs text-text-muted">
                ({persona.killerAffinity}{text.percentSign})
              </span>
            </div>
          </div>
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
