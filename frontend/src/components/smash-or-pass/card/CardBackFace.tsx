'use client';
// frontend/src/components/smash-or-pass/card/CardBackFace.tsx
import { themedEdgeStyle } from '@/utils/smashOrPass/badgeGradient';
import { HeartIcon, PassIcon, CardFlipIcon } from '@/components/icons/DbdIcons';
import { Button } from '@/components/common/Button';
import { Surface } from '@/components/common/Surface';
import { tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';
import type { EntityItem, RosterCustomLabels } from '@/types/smashOrPass';
import type { localizedProfile } from '@/utils/entityProfile';
import { Badge } from '@/components/common/Badge';
import { roleBadge } from '@/utils/smashOrPass/terms';

interface CardBackFaceProps {
  character: EntityItem;
  profile: ReturnType<typeof localizedProfile>;
  isFlipped: boolean;
  customLabels?: RosterCustomLabels;
  rosterMode?: 'simple' | 'full';
  /** The green / red flags to list, already picked by the card (see `sampleFlags`). */
  /** The roster's `theme_color`: a gradient one paints the card's edge. */
  themeColor?: string;
  greenFlags?: string[];
  redFlags?: string[];
  onFlip: () => void;
  onVote: (type: 'smash' | 'pass', origin?: { x: number; y: number }) => void;
}

/** The dating-profile side of the card: vibe, turn on, dealbreaker, quote, flags, and the vote buttons. */
export function CardBackFace({
  character,
  profile,
  isFlipped,
  customLabels,
  rosterMode = 'full',
  themeColor,
  greenFlags = [],
  redFlags = [],
  onFlip,
  onVote,
}: CardBackFaceProps) {
  const dict = useDictionary();
  const text = dict.smashOrPass;
  const role = roleBadge(character.role, text.filters);
  // `|| character.role` is a render-level default for an entity with no archetype yet,
  // not a data fallback — localizedProfile already resolved locale vs. English.
  const charTitle = profile.archetype || character.role;
  const charTagline = profile.tagline;
  const charBio = profile.bio;
  const charQuote = profile.quote;
  const charMeme: string = profile.meme;
  const showBio = rosterMode !== 'simple' && Boolean(charBio);
  const showMeme = rosterMode !== 'simple' && Boolean(charMeme);

  return (
    <div
      style={{
        ...themedEdgeStyle(themeColor, 'var(--bg-primary)'),
        pointerEvents: isFlipped ? 'auto' : 'none',
        visibility: isFlipped ? 'visible' : 'hidden',
      }}
      // Clicking the card turns it back for pointer users; the Flip Back button is the
      // keyboard control (role="presentation": no second control). The lore text is
      // selectable, so clicks inside it never flip.
      role="presentation"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-card-lore]')) return;
        onFlip();
      }}
      className="!absolute inset-0 h-full w-full rounded-card overflow-hidden card-ash-border bg-bg-primary p-4 sm:p-5 flex flex-col justify-between text-text-primary cursor-pointer select-none"
    >
      {/* Top Bar with accessible Flip Back button and Title */}
      <div className="relative z-30 flex items-center justify-between pb-2 border-b border-border-color shrink-0 pointer-events-auto">
        <Button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onFlip();
          }}
          {...tip(text.flipBack, undefined, 'action')}
          aria-label={text.flipBack}
          variant="soft" size="md" icon
        >
          <CardFlipIcon aria-hidden="true" />
        </Button>

        <div className="flex items-center gap-1.5 px-2 min-w-0">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-primary truncate max-w-37.5 sm:max-w-45">
            {character.name}
          </h3>
        </div>

        <Badge tone={role.tone} size="xs" square>
          {role.label}
        </Badge>
      </div>

      {/* Scrollable Back Content */}
      <div className="relative my-2 flex-1 min-h-0">
      <div
        data-card-lore=""
        className="space-y-2 h-full pr-1 overflow-y-auto select-text pointer-events-auto scrollbar-thin scrollbar-thumb-border-color"
      >
        {/* Mobile-only fallback (<880px): show Turn On & Dealbreaker only when floating lore fragments are hidden */}
        <div className="@hub-lg/hub:hidden space-y-2">
          <Surface tone="elevated" padding="none" className="p-2.5 border-accent-red/30 space-y-0.5">
            <span className="type-label-2xs text-accent-red block">
              {customLabels?.dating_vibe || text.loreLabels.datingArchetype}
            </span>
            <p className="type-strong text-text-primary leading-snug">{charTitle}</p>
          </Surface>

          {profile.turn_on && (
            <div className="p-2.5 rounded-card bg-accent-green/10 border border-accent-green/40 space-y-0.5">
              <span className="type-label-2xs text-accent-green block">
                {customLabels?.turn_on || text.loreLabels.turn_on}
              </span>
              <p className="text-mini text-text-primary leading-snug">{profile.turn_on}</p>
            </div>
          )}

          {profile.dealbreaker && (
            <div className="p-2.5 rounded-card bg-accent-red/10 border border-accent-red/40 space-y-0.5">
              <span className="type-label-2xs text-accent-red block">
                {customLabels?.dealbreaker || text.loreLabels.dealbreaker}
              </span>
              <p className="text-mini text-text-primary leading-snug">{profile.dealbreaker}</p>
            </div>
          )}
        </div>

        {/* Green & Red Flags (Prominent and unique to the card back) */}
        {(greenFlags.length > 0 || redFlags.length > 0) && (
          <Surface tone="elevated" padding="none" className="p-2.5 space-y-2">
            {greenFlags.length > 0 && (
              <div className="space-y-1">
                <span className="type-label-2xs text-accent-green block">{text.greenFlags}</span>
                <ul className="text-mini text-text-primary leading-snug space-y-1 pl-4 list-disc marker:text-accent-green">
                  {greenFlags.map((flag, i) => (
                    <li key={`g-${i}-${flag}`}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}
            {redFlags.length > 0 && (
              <div className="space-y-1">
                <span className="type-label-2xs text-accent-red block">{text.redFlags}</span>
                <ul className="text-mini text-text-primary leading-snug space-y-1 pl-4 list-disc marker:text-accent-red">
                  {redFlags.map((flag, i) => (
                    <li key={`r-${i}-${flag}`}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}
          </Surface>
        )}

        {/* Bio / Lore & Personality */}
        {showBio && (
          <Surface tone="elevated" padding="none" className="p-2.5 space-y-1">
            <span className="type-label-2xs text-text-muted">{text.loreAndPersonality}</span>
            <p className="type-body text-text-secondary leading-snug">{charBio}</p>
          </Surface>
        )}

        {/* Trial Rumor / Meme */}
        {showMeme && (
          <Surface tone="elevated" padding="none" className="p-2.5 space-y-0.5">
            <span className="type-label-2xs text-text-secondary block">{customLabels?.meme || text.trialRumor}</span>
            <p className="text-mini text-text-secondary italic leading-snug">{charMeme}</p>
          </Surface>
        )}

        {/* Quote/tagline shown inline when the floating lore fragments are hidden (narrow hubs) */}
        {(Boolean(charTagline) || Boolean(charQuote)) && (
          <div className="@hub-lg/hub:hidden space-y-2.5">
            {charTagline && <p className="px-1 text-mini text-text-secondary italic leading-snug">{charTagline}</p>}

            {charQuote && (
              <Surface tone="elevated" padding="none" className="p-2.5 border-accent-amber/30 space-y-0.5">
                <span className="type-label-2xs text-accent-amber block">
                  {customLabels?.quote || text.loreLabels.signatureQuote}
                </span>
                <p className="text-mini text-text-secondary italic leading-relaxed">{charQuote}</p>
              </Surface>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Bottom actions: the same round icon buttons as the front of the card */}
      <div className="pt-2 flex items-center justify-between border-t border-border-color shrink-0 gap-2 pointer-events-auto">
        <Button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            onVote('pass', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
          }}
          {...tip(text.pass, undefined, 'action')}
          aria-label={text.pass}
          variant="secondary" size="lg" icon className="h-13 w-13 shadow-2xl backdrop-blur-md hover:scale-110 active:scale-95 touch-manipulation sm:h-14 sm:w-14"
        >
          <PassIcon className="icon-xl sm:h-7 sm:w-7" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            onVote('smash', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
          }}
          {...tip(text.smash, undefined, 'action')}
          aria-label={text.smash}
          variant="primary" size="lg" icon className="h-13 w-13 hover:scale-110 active:scale-95 touch-manipulation sm:h-14 sm:w-14"
        >
          <HeartIcon className="icon-xl sm:h-7 sm:w-7" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
