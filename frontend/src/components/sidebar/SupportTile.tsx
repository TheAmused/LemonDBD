// frontend/src/components/sidebar/SupportTile.tsx
// One way to support the site, as a row in the support dialog: icon, name, a line about it and the
// action on the right. A tile with an `href` is a link out (Buy Me a Coffee, Ko-fi); one with an
// `onClick` is a button that acts in place (watch an ad). `actionTone` sets the action button apart.
import React from 'react';
import { surfaceClassName } from '@/components/common/Surface';
import { TileButton } from '@/components/common/TileButton';
import { cn } from '@/utils/cn';

type TileIcon = React.ComponentType<{ className?: string }>;

export interface SupportTileProps {
  icon: TileIcon;
  name: string;
  tagline: string;
  actionLabel: string;
  /** Shown beside the label (on phones it replaces it): an arrow out for a link, a chevron for an ad. */
  actionIcon: TileIcon;
  /** Colour of the action button: red like the other ways to support, amber to set one apart. */
  actionTone?: 'red' | 'amber';
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}

const TILE_CLASS =
  'group flex w-full items-center justify-between gap-3 p-3.5 text-left rounded-control border transition-all duration-200 disabled:pointer-events-none disabled:opacity-60 ' +
  'border-border-color bg-bg-elevated text-text-secondary hover:border-accent-red/40 hover:bg-accent-red/10';
const ACTION_TONES = {
  red: { chip: 'bg-accent-red', arrow: 'group-hover:text-accent-red' },
  amber: { chip: 'bg-accent-amber', arrow: 'group-hover:text-accent-amber' },
};

export function SupportTile({
  icon: Icon,
  name,
  tagline,
  actionLabel,
  actionIcon: ActionIcon,
  actionTone = 'red',
  href,
  onClick,
  disabled,
}: SupportTileProps) {
  // Spans, not divs and headings: the tile can be a <button>, which allows only inline content inside.
  const content = (
    <>
      <span className="flex items-center gap-3">
        <span className={cn(surfaceClassName('elevated', 'none'), 'flex h-10 w-10 shrink-0 items-center justify-center shadow-sm group-hover:scale-105 transition-transform')}>
          <Icon className="icon-lg" />
        </span>
        <span>
          <span className="block text-xs font-black tracking-wide text-text-primary">{name}</span>
          <span className="block type-caption text-text-muted">{tagline}</span>
        </span>
      </span>

      <span className="flex items-center gap-2">
        <span className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-control type-label-xs shadow-md group-hover:scale-105 transition-all text-text-inverted ${ACTION_TONES[actionTone].chip}`}>
          <span>{actionLabel}</span>
          <ActionIcon className="icon-xs" />
        </span>
        <ActionIcon className={`sm:hidden icon-md text-text-muted transition-colors ${ACTION_TONES[actionTone].arrow}`} />
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={`cursor-pointer ${TILE_CLASS}`}>
        {content}
      </a>
    );
  }
  return (
    <TileButton press={false} onClick={onClick} disabled={disabled} aria-busy={disabled} className={TILE_CLASS}>
      {content}
    </TileButton>
  );
}
