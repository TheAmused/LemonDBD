// frontend/src/components/layout/PageShellFallback.tsx
import type { ReactNode } from 'react';
import {
  DEFAULT_OUTER_CLASSNAME,
  PAGE_SHELL_PADDING_CLASSES,
  type PageShellPadding,
} from '@/components/layout/PageShell';

interface PageShellFallbackProps {
  /** Padding scale for <main>, matching PageShell's own scale. Defaults to 'comfortable'. */
  padding?: PageShellPadding;
  /** Escape hatch for a page whose padding doesn't match a named variant. */
  customPadding?: string;
  /** Extra classes appended to <main>. */
  mainClassName?: string;
  /** Override the outer wrapper's classes -- must match the `outerClassName`
   * the page's real PageShell call uses, or the shell will visibly resize
   * the instant Suspense resolves. */
  outerClassName?: string;
  /** The page's own loading skeleton, rendered inside <main>. */
  skeleton: ReactNode;
}

/**
 * The pre-hydration twin of PageShell: same outer shell and sidebar-slot
 * placeholder, rendered by a page's outermost Suspense boundary before
 * PageShell (and the real Sidebar) ever mounts. Kept visually inert (no
 * data, no interactivity) and on the same theme tokens as PageShell so the
 * loading flash doesn't break the light-lemon theme the way the pre-PageShell
 * per-page fallbacks did.
 */
export function PageShellFallback({
  padding = 'comfortable',
  customPadding,
  mainClassName = '',
  outerClassName,
  skeleton,
}: PageShellFallbackProps) {
  const shellClass = padding === 'flush' ? 'lemon-shell-main--flush' : 'lemon-shell-main';
  const mainClasses = [
    'flex-1 w-full',
    customPadding ?? PAGE_SHELL_PADDING_CLASSES[padding],
    shellClass,
    mainClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={outerClassName ?? DEFAULT_OUTER_CLASSNAME}>
      <aside
        aria-hidden="true"
        className="lemon-shell-aside hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col border-r border-border-color bg-bg-surface/80 p-4 select-none animate-pulse"
      />
      {/* Reserves the space Sidebar's own sticky mobile header takes once it mounts, so it doesn't shift layout. */}
      <div aria-hidden="true" className="h-16 shrink-0 border-b border-border-color bg-bg-surface lg:hidden" />
      <main className={mainClasses}>{skeleton}</main>
    </div>
  );
}
