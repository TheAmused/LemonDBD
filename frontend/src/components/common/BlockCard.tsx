'use client';
// frontend/src/components/common/BlockCard.tsx
//
// The collapsible content card shared by About us, the Privacy Policy and the Rules page.
//
// Animation: the body opens and closes by animating its grid row between 0fr and 1fr, so the
// card's height always follows its content, in both directions. Two cards side by side
// (<BlockCardPair>) must also stay the same height while both are open. A CSS height cannot
// animate between "fit its content" and "stretch to the row", so nothing here ever stretches:
// each card carries an invisible copy of its neighbour that only counts while the card itself is
// open. The taller of the two sets the height, and every change is one more 0fr <-> 1fr
// transition. (Switching a card between `self-start` and `self-stretch` is what made the old
// About cards snap open.)
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import { cn } from '@/utils/cn';

/** The site's two accents: red, and amber (the golden one). */
export type BlockTone = 'red' | 'amber';

interface BlockToneClasses {
  /** Coloured text (card title, small labels). */
  text: string;
  /** Tinted, bordered callout. */
  bubble: string;
  /** Bullet colour of a list. */
  marker: string;
  /** Card border on hover. */
  hover: string;
}

/** Every class is spelled out in full so Tailwind can see it. */
export const BLOCK_TONES: Readonly<Record<BlockTone, BlockToneClasses>> = {
  red: { text: 'text-accent-red', bubble: 'border-accent-red/40 bg-accent-red/10', marker: 'marker:text-accent-red', hover: 'hover:border-accent-red/40' },
  amber: { text: 'text-accent-amber', bubble: 'border-accent-amber/40 bg-accent-amber/10', marker: 'marker:text-accent-amber', hover: 'hover:border-accent-amber/40' },
};

interface BlockTitleProps {
  title: string;
  /** Small line above the title, e.g. "Rule 3". */
  eyebrow?: string;
  tone?: BlockTone;
  /** Centre the eyebrow and the title. Default: left-aligned. */
  centered?: boolean;
  /** Heading level of the title. Default 'h2'. */
  as?: 'h2' | 'h3';
  /** DOM id of the heading, so a control can name itself after it. */
  headingId?: string;
}

/** Eyebrow + title: the head of a card, also used by the rules modal. */
export function BlockTitle({ title, eyebrow, tone = 'red', centered = false, as: Heading = 'h2', headingId }: BlockTitleProps) {
  const t = BLOCK_TONES[tone];
  return (
    <span className={cn('flex min-w-0 flex-col', centered ? 'w-full items-center text-center' : 'text-left')}>
      {eyebrow ? <span className="type-label-2xs text-text-muted">{eyebrow}</span> : null}
      <Heading id={headingId} className={cn('text-xs font-bold uppercase tracking-widest sm:text-sm', t.text)}>
        {title}
      </Heading>
    </span>
  );
}

/** What a card shows. A card and the hidden copy its neighbour carries are drawn from the same one. */
interface BlockCardSpec extends Omit<BlockTitleProps, 'as' | 'headingId'> {
  id: string;
  /** Text styles of the body. Default: small running text. */
  bodyClassName?: string;
  children: React.ReactNode;
}

export interface BlockCardProps extends BlockCardSpec {
  /** localStorage key remembering whether the card is open. */
  storageKey: string;
  className?: string;
}

const DEFAULT_BODY = 'text-sm leading-relaxed sm:text-base';

/** Where the two columns start, i.e. from which width the neighbour's copy is needed. Spelled out for Tailwind. */
const GHOST_FROM = { lg: 'hidden lg:grid', xl: 'hidden xl:grid' } as const;

/** Header button + animated body. `ghost` draws the inert copy used only for sizing. */
function CardFace({ spec, expanded, onToggle, ghost = false }: { spec: BlockCardSpec; expanded: boolean; onToggle?: () => void; ghost?: boolean }) {
  const tone = BLOCK_TONES[spec.tone ?? 'red'];
  const titleId = ghost ? undefined : `${spec.id}-title`;
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        tabIndex={ghost ? -1 : undefined}
        aria-expanded={ghost ? undefined : expanded}
        aria-labelledby={titleId}
        className={cn(
          'relative flex w-full items-center py-4 text-left',
          ghost ? '' : 'cursor-pointer select-none',
          spec.centered ? 'px-12 sm:px-14' : 'px-4 pr-12 sm:px-6 sm:pr-14'
        )}
      >
        <BlockTitle title={spec.title} eyebrow={spec.eyebrow} tone={spec.tone} centered={spec.centered} headingId={titleId} />
        <ChevronDown
          className={cn(
            'absolute right-5 h-4 w-4 transition-transform duration-300 ease-in-out sm:right-7 sm:h-5 sm:w-5',
            tone.text,
            expanded ? 'rotate-180' : 'rotate-0'
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className={cn('flex flex-col gap-2 border-t border-border-color p-4 sm:p-6', spec.bodyClassName ?? DEFAULT_BODY)}>
            {spec.children}
          </div>
        </div>
      </div>
    </>
  );
}

interface BlockCardViewProps {
  spec: BlockCardSpec;
  className?: string;
  expanded: boolean;
  onToggle: () => void;
  /** The card next to this one in the row, when there is one. */
  neighbour?: { spec: BlockCardSpec; expanded: boolean; from: keyof typeof GHOST_FROM };
}

function BlockCardView({ spec, className, expanded, onToggle, neighbour }: BlockCardViewProps) {
  const tone = BLOCK_TONES[spec.tone ?? 'red'];
  return (
    <section
      id={spec.id}
      className={cn(
        'grid w-full scroll-mt-6 self-start overflow-hidden rounded-3xl border border-border-color bg-bg-surface shadow-md backdrop-blur-xl transition-colors',
        tone.hover,
        className
      )}
    >
      <div className="col-start-1 row-start-1 flex min-w-0 flex-col">
        <CardFace spec={spec} expanded={expanded} onToggle={onToggle} />
      </div>
      {neighbour ? (
        // Counts toward the height only while THIS card is open (1fr); a collapsed card is just its title.
        <div
          aria-hidden="true"
          inert
          className={cn(
            'pointer-events-none invisible col-start-1 row-start-1 min-w-0 select-none transition-[grid-template-rows] duration-300 ease-in-out',
            GHOST_FROM[neighbour.from],
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          )}
        >
          <div className="overflow-hidden">
            <CardFace spec={neighbour.spec} expanded={neighbour.expanded} ghost />
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** A single collapsible card (open by default, state remembered per storage key). */
export function BlockCard({ storageKey, className, ...spec }: BlockCardProps) {
  const [expanded, toggle] = usePersistentDrawer(storageKey, true);
  return <BlockCardView spec={spec} className={className} expanded={expanded} onToggle={toggle} />;
}

interface BlockCardPairProps {
  a: BlockCardProps;
  b: BlockCardProps;
  /** Width from which the two sit side by side. Default 'lg'. */
  from?: keyof typeof GHOST_FROM;
}

/**
 * Two cards that are neighbours in a grid row. Renders both as direct children of the grid, so
 * place it inside one. Open together they share the taller one's height; either can collapse to
 * its title, and re-open, with the same smooth animation.
 */
export function BlockCardPair({ a, b, from = 'lg' }: BlockCardPairProps) {
  const [aOpen, toggleA] = usePersistentDrawer(a.storageKey, true);
  const [bOpen, toggleB] = usePersistentDrawer(b.storageKey, true);
  return (
    <>
      <BlockCardView spec={a} className={a.className} expanded={aOpen} onToggle={toggleA} neighbour={{ spec: b, expanded: bOpen, from }} />
      <BlockCardView spec={b} className={b.className} expanded={bOpen} onToggle={toggleB} neighbour={{ spec: a, expanded: aOpen, from }} />
    </>
  );
}
