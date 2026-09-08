// frontend/src/components/layout/PageShell.tsx
import type { ReactNode } from 'react';
import { AmbientEmbers } from '@/components/layout/AmbientEmbers';
import { Sidebar } from '@/components/Sidebar';
import type { Dictionary } from '@/locales/types';

/**
 * The 4 padding scales actually in use across pages: tight (dense grids like
 * perks/maps), comfortable (most pages), spacious (content-focused pages),
 * and flush (randomizer has its own internal padding).
 */
export type PageShellPadding = 'tight' | 'comfortable' | 'spacious' | 'flush';

export const PAGE_SHELL_PADDING_CLASSES: Record<PageShellPadding, string> = {
  tight: 'p-3 sm:p-4 lg:p-6',
  comfortable: 'p-4 sm:p-6 lg:p-8',
  spacious: 'p-5 sm:p-7 lg:p-9',
  flush: '',
};

interface PageShellProps {
  locale: string;
  dict: Dictionary;
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
  onOpenQuests?: () => void;
  totalPerksCount?: number;
  survivorCount?: number;
  killerCount?: number;
  characterCount?: number;
  /** Padding scale for <main>. Defaults to 'comfortable'. Ignored if `customPadding` is set. */
  padding?: PageShellPadding;
  /** Escape hatch for a page whose padding scale doesn't match any of the 4
   * named variants. Prefer a named variant when a page's padding matches one. */
  customPadding?: string;
  /** Extra classes appended to <main> for a page's own internal layout (flex direction, gap, overflow, min-height). */
  mainClassName?: string;
  mainId?: string;
  /** Override the outer wrapper's classes entirely. Only use for a page with a genuinely different shell shape (e.g. the home page's ambient background). */
  outerClassName?: string;
  /** Rendered as the outer wrapper's first child, before the sidebar -- for a
   * full-bleed absolute-positioned background decoration that must sit behind
   * both the sidebar and <main> (requires `outerClassName` to include `relative`). */
  decoration?: ReactNode;
  children: ReactNode;
}

export const DEFAULT_OUTER_CLASSNAME =
  'min-h-screen bg-bg-primary text-text-primary flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300';

/**
 * Single source of truth for the sidebar + <main> shell every page renders.
 * Change a padding scale or the shell/sidebar wiring here once, instead of
 * in every page.tsx -- this is exactly the pattern whose per-page drift
 * caused the sitewide padding regression this shell class was named after.
 */
export function PageShell({
  locale,
  dict,
  activeCategory,
  onSelectCategory,
  onOpenQuests,
  totalPerksCount,
  survivorCount,
  killerCount,
  characterCount,
  padding = 'comfortable',
  customPadding,
  mainClassName = '',
  mainId,
  outerClassName,
  decoration,
  children,
}: PageShellProps) {
  // The flush margin variant (`lemon-shell-main--flush`) is keyed off
  // `padding`, not `customPadding` -- `customPadding` overrides only the
  // spacing classes (see mainClasses below), so a page can still combine
  // `padding="flush"` with a non-empty `customPadding` to get flush margins
  // plus its own spacing. No current page needs that combination.
  const shellClass = padding === 'flush' ? 'lemon-shell-main--flush' : 'lemon-shell-main';
  const mainClasses = [
    'flex-1 w-full transition-[padding] duration-300',
    customPadding ?? PAGE_SHELL_PADDING_CLASSES[padding],
    shellClass,
    mainClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={outerClassName ?? DEFAULT_OUTER_CLASSNAME}>
      {decoration ?? <AmbientEmbers />}
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory={activeCategory}
        onSelectCategory={onSelectCategory}
        onOpenQuests={onOpenQuests}
        totalPerksCount={totalPerksCount}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />
      <main id={mainId} className={mainClasses}>
        {children}
      </main>
    </div>
  );
}
