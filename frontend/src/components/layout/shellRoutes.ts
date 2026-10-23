// frontend/src/components/layout/shellRoutes.ts
//
// THE single source of truth for the page shell (sidebar + <main>) each route gets.
// AppShell (mounted ONCE in app/[locale]/layout.tsx) reads this file, so the sidebar is
// never torn down between navigations and a route's loading.tsx / Suspense fallbacks render
// inside the very same <main> as the page that follows them -- no second, re-positioned shell.
//
// Pages and loading.tsx files render CONTENT ONLY. To change a page's padding or <main>
// classes, edit its line below. To give a page no shell at all, set `shell: false`.
// A route not listed gets ERROR_SHELL (it is what the 404 page uses).

import { i18n } from '@/i18n/config';

/**
 * The 4 padding scales actually in use across pages: tight (dense grids like
 * perks/tier-list boards), comfortable (most pages), spacious (content-focused pages),
 * and flush (randomizer has its own internal padding).
 */
export type ShellPadding = 'tight' | 'comfortable' | 'spacious' | 'flush';

export const SHELL_PADDING_CLASSES: Record<ShellPadding, string> = {
  tight: 'p-3 sm:p-4 lg:p-6',
  comfortable: 'p-4 sm:p-6 lg:p-8',
  spacious: 'p-5 sm:p-7 lg:p-9',
  flush: '',
};

export const DEFAULT_SHELL_OUTER_CLASSNAME =
  'min-h-screen text-text-primary flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300';

export interface ShellSpec {
  /** Named padding scale for <main>. Defaults to 'comfortable'. Ignored if `customPadding` is set. */
  padding?: ShellPadding;
  /** Escape hatch for a page whose padding matches none of the named scales. */
  customPadding?: string;
  /** Extra classes for <main>: the page's own internal layout (flex direction, overflow, min-height). */
  mainClassName?: string;
  mainId?: string;
  /** Replaces the outer wrapper's classes. Only for a page with a genuinely different shell shape. */
  outerClassName?: string;
}

const CENTERED_PAGE = {
  customPadding: 'p-4 sm:p-8 lg:p-12',
  mainClassName: 'flex items-center justify-center min-h-screen-nav lg:min-h-screen',
} as const satisfies ShellSpec;

/** The "you can't see this" pages (404, 403, blocked, crashed) -- the home layout with different words. */
export const ERROR_SHELL: ShellSpec = { ...CENTERED_PAGE, mainId: 'main-error-content' };

const LEGAL: ShellSpec = {
  padding: 'spacious',
  mainClassName: 'flex flex-col items-center min-h-screen-nav lg:min-h-screen overflow-y-auto relative',
};

const MINIGAME_CENTERED: ShellSpec = {
  mainClassName: 'relative flex flex-col items-center justify-center min-h-vh-70',
};

const TIER_LIST_WORKSPACE: ShellSpec = { padding: 'tight', mainClassName: 'relative flex flex-col' };

export interface ShellRoute {
  /** Path segments after the locale. `[]` is the home page. */
  prefix: readonly string[];
  /** Match only this exact path, not the pages beneath it. */
  exact?: boolean;
  shell: ShellSpec | false;
}

export const ROUTE_SHELLS: ReadonlyArray<ShellRoute> = [
  { prefix: [], shell: CENTERED_PAGE },  // home  /
  { prefix: ['about'], shell: { padding: 'spacious', mainClassName: 'flex flex-col items-center justify-center min-h-screen-nav lg:min-h-screen overflow-y-auto relative' } },
  { prefix: ['achievements'], shell: { padding: 'spacious' } },
  { prefix: ['admin'], shell: { mainId: 'main-admin-content', mainClassName: 'overflow-y-auto' } },
  { prefix: ['blocked'], shell: ERROR_SHELL },
  { prefix: ['characters'], shell: { mainClassName: 'relative overflow-y-auto' } },  // list + [slug] detail
  { prefix: ['forbidden'], shell: ERROR_SHELL },
  { prefix: ['maps'], shell: { customPadding: 'p-4 sm:p-6 lg:p-7', mainClassName: 'relative min-h-screen flex flex-col gap-4' } },
  { prefix: ['minigames'], shell: { mainClassName: 'relative flex flex-col' } },  // hub
  { prefix: ['minigames', 'creator'], shell: MINIGAME_CENTERED },
  { prefix: ['minigames', 'idle'], shell: MINIGAME_CENTERED },
  { prefix: ['minigames', 'play'], shell: MINIGAME_CENTERED },
  {
    prefix: ['perks'],
    shell: {
      padding: 'tight',
      outerClassName: 'h-dvh overflow-hidden text-text-primary flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300',
      mainClassName: 'relative flex h-full min-h-0 flex-col overflow-hidden gap-3 sm:gap-4',
    },
  },
  { prefix: ['privacy-policy'], shell: LEGAL },
  { prefix: ['randomizer'], shell: { padding: 'flush', mainClassName: 'min-h-screen overflow-y-auto flex flex-col relative' } },
  { prefix: ['reset-password'], shell: false },  // a bare, centred form: no sidebar
  { prefix: ['rules'], shell: LEGAL },
  { prefix: ['smash-or-pass'], shell: { mainClassName: 'overflow-y-auto theme-smash' } },  // hub
  { prefix: ['smash-or-pass', 'create'], shell: TIER_LIST_WORKSPACE },
  {
    prefix: ['streaks'],  // hub, [role], and every challenge run
    shell: {
      padding: 'spacious',
      mainClassName: 'overflow-y-auto',
      // Streaks has never painted the fog overlay; kept as it was.
      outerClassName: 'min-h-screen text-text-primary flex flex-col lg:flex-row transition-colors duration-300',
    },
  },
  { prefix: ['terms-of-service'], shell: LEGAL },
  { prefix: ['tier-lists'], exact: true, shell: { mainClassName: 'relative flex flex-col' } },  // hub
  { prefix: ['tier-lists'], shell: TIER_LIST_WORKSPACE },  // [slug] view
  { prefix: ['tier-lists', 'custom'], shell: TIER_LIST_WORKSPACE },  // custom/[id]
  { prefix: ['tier-lists', 'new'], shell: TIER_LIST_WORKSPACE },
  { prefix: ['user'], shell: { mainClassName: 'overflow-y-auto relative' } },
  { prefix: ['welcome'], shell: false },  // the onboarding wizard owns the whole screen
];

export interface ShellMatch {
  shell: ShellSpec | false;
  /** False when no ROUTE_SHELLS line matched and ERROR_SHELL was used. */
  listed: boolean;
}

/** The shell for a path (segments after the locale). The longest matching prefix wins; an exact line beats a prefix line of the same length. */
export function matchShell(segments: readonly string[]): ShellMatch {
  let best: ShellRoute | null = null;
  for (const route of ROUTE_SHELLS) {
    const { prefix } = route;
    const matches =
      prefix.length === 0
        ? segments.length === 0
        : route.exact
          ? segments.length === prefix.length && prefix.every((s, i) => segments[i] === s)
          : prefix.length <= segments.length && prefix.every((s, i) => segments[i] === s);
    if (!matches) continue;
    if (!best || prefix.length > best.prefix.length || (prefix.length === best.prefix.length && route.exact && !best.exact)) {
      best = route;
    }
  }
  return best ? { shell: best.shell, listed: true } : { shell: ERROR_SHELL, listed: false };
}

/** Path segments after the locale: `/en/tier-lists/x` -> ['tier-lists', 'x']. */
export function segmentsAfterLocale(pathname: string): string[] {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length && (i18n.locales as readonly string[]).includes(segments[0])) segments.shift();
  return segments;
}

export function shellForPathname(pathname: string): ShellMatch {
  return matchShell(segmentsAfterLocale(pathname));
}

export interface ShellClasses {
  outer: string;
  main: string;
  mainId?: string;
}

/** The final class strings for a spec -- what AppShell puts on the outer wrapper and <main>. */
export function shellClasses(spec: ShellSpec): ShellClasses {
  const padding = spec.padding ?? 'comfortable';
  // The flush margin variant (`lemon-shell-main--flush`) is keyed off `padding`, not
  // `customPadding`, which overrides only the spacing classes.
  const shellClass = padding === 'flush' ? 'lemon-shell-main--flush' : 'lemon-shell-main';
  const main = [
    'flex-1 w-full transition-[padding] duration-300',
    spec.customPadding ?? SHELL_PADDING_CLASSES[padding],
    shellClass,
    spec.mainClassName ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return { outer: spec.outerClassName ?? DEFAULT_SHELL_OUTER_CLASSNAME, main, mainId: spec.mainId };
}
