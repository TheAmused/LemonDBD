// frontend/src/hooks/useSidebarState.ts
'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

const SIDEBAR_COLLAPSED_KEY = 'lemon_dbd_sidebar_collapsed';
const SIDEBAR_ATTRIBUTE = 'data-sidebar';
const SIDEBAR_EVENT = 'sidebar-state-changed';

/**
 * Reads the state that the blocking script in `app/[locale]/layout.tsx` already
 * applied to <html> before first paint.
 */
function readCollapsedFromDom(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute(SIDEBAR_ATTRIBUTE) === 'collapsed';
}

function applyCollapsedToDom(collapsed: boolean): void {
  if (typeof document === 'undefined') return;
  if (collapsed) {
    document.documentElement.setAttribute(SIDEBAR_ATTRIBUTE, 'collapsed');
  } else {
    document.documentElement.removeAttribute(SIDEBAR_ATTRIBUTE);
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(SIDEBAR_EVENT, onChange);
  return () => window.removeEventListener(SIDEBAR_EVENT, onChange);
}

/**
 * Sidebar collapse state.
 *
 * The *layout* no longer reads `isCollapsed` -- the gutter and the sidebar
 * transform are driven entirely by the `data-sidebar` attribute on <html>
 * (see `.lemon-shell-main` / `.lemon-shell-aside` in globals.css). That is what
 * removes the 208px slide that used to happen on every navigation: the
 * attribute is set before the first paint, whereas this hook's state cannot
 * settle until after the first render.
 *
 * `isCollapsed` remains available for non-layout concerns (labels, analytics).
 * It reads the attribute through useSyncExternalStore: `false` on the server and
 * during hydration so they match, the attribute from then on.
 */
export function useSidebarState() {
  const isCollapsed = useSyncExternalStore(subscribe, readCollapsedFromDom, () => false);

  // The inline script is the source of truth, but re-read storage in case it
  // was blocked (strict CSP, script error) so the attribute still gets set.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (saved !== null && (saved === 'true') !== readCollapsedFromDom()) {
        applyCollapsedToDom(saved === 'true');
        window.dispatchEvent(new Event(SIDEBAR_EVENT));
      }
    } catch {
      // Storage unavailable (private mode / blocked cookies) -- keep the DOM value.
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    const next = !readCollapsedFromDom();

    // Apply to the DOM first so the CSS-driven layout moves in the same frame
    // as the click, rather than waiting on a React commit.
    applyCollapsedToDom(next);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    } catch {
      // Non-fatal: the sidebar still toggles, it just will not persist.
    }
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  }, []);

  return { isCollapsed, toggleSidebar };
}
