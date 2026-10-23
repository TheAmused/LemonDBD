'use client';
// frontend/src/components/layout/AppShell.tsx
//
// The one sidebar + <main> host. Mounted ONCE in app/[locale]/layout.tsx, so -- like AppBackground --
// it is never torn down between navigations: the sidebar keeps its DOM, scroll position, open
// dropdowns and fetched state while the page inside <main> swaps. Which shell a route gets is
// decided by shellRoutes.ts; pages and loading.tsx files render content only.
//
// Because the shell outlives the page, a route's loading.tsx and the page's own Suspense
// fallbacks render inside the very same <main> as the page that follows them.

import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { useLocale } from '@/context/DictionaryContext';
import { shellClasses, shellForPathname, type ShellSpec } from '@/components/layout/shellRoutes';

type SetShellOverride = (spec: ShellSpec | null) => void;

const ShellOverrideContext = createContext<SetShellOverride | null>(null);

/**
 * Lets a component that replaces the page (the error boundary, a rewritten "blocked" page) say
 * which shell it needs, whatever URL it was reached through. `spec` must be a stable reference
 * (a module constant). Applied before paint; removed when the component unmounts.
 */
export function useShellOverride(spec: ShellSpec): void {
  const setOverride = useContext(ShellOverrideContext);
  useLayoutEffect(() => {
    if (!setOverride) return undefined;
    setOverride(spec);
    return () => setOverride(null);
  }, [setOverride, spec]);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const locale = useLocale();
  const [override, setOverride] = useState<ShellSpec | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  const routeShell = useMemo(() => shellForPathname(pathname).shell, [pathname]);
  const spec = override ?? routeShell;
  const classes = useMemo(() => (spec ? shellClasses(spec) : null), [spec]);

  // The <main> now outlives the page, so one that scrolls itself must start at the top of the next page.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <ShellOverrideContext.Provider value={setOverride}>
      {classes ? (
        <div className={classes.outer}>
          <Sidebar currentLocale={locale} />
          {/* Keyed by its classes: a page with a different shell gets a fresh <main> instead of
              animating its padding (`transition-[padding]`) while its content swaps. The sidebar
              is a sibling, so it is untouched either way. */}
          <main key={classes.main} ref={mainRef} id={classes.mainId} className={classes.main}>
            {children}
          </main>
        </div>
      ) : (
        children
      )}
    </ShellOverrideContext.Provider>
  );
}
