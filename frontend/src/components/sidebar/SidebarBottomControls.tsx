'use client';
// frontend/src/components/sidebar/SidebarBottomControls.tsx
import type { Dictionary } from '@/locales/types';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop, Citrus } from 'lucide-react';
import { FlagIcon } from './FlagIcon';
import { FogReportIcon, CampfireMugIcon } from '@/components/icons/DbdIcons';

import { tip } from '@/components/common/Tooltip';
import { FitText } from '@/components/common/FitText';
import { useDictionary } from "@/context/DictionaryContext";

// Keep in sync with the backend's own locale list -- SUPPORTED_LOCALES in
// backend/app/utils/lang.py. No shared
// source of truth across the Python/TypeScript boundary; a locale added to
// only one side means the backend can reject a language this list offers
// (or vice versa).
export const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'pl', label: 'Polski' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' },
];

type ThemeOptionId = 'light' | 'light-lemon' | 'dark' | 'system';

export interface SidebarBottomControlsProps {
  currentLocale: string;
  onOpenBugModal: () => void;
  onOpenCoffeeModal: () => void;
  theme?: string;
  setTheme?: (theme: string) => void;
  mounted?: boolean;
}

/** Closes an open dropdown on an outside click or Escape. Shared by the
 * language and theme pickers below instead of each carrying its own copy. */
function useDismissOnOutsideOrEscape(
  active: boolean,
  ref: React.RefObject<HTMLElement | null>,
  onDismiss: () => void
) {
  useEffect(() => {
    if (!active) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, ref, onDismiss]);
}

const FOCUS_RING = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red';

export const SidebarBottomControls: React.FC<SidebarBottomControlsProps> = ({
      currentLocale,
      onOpenBugModal,
      onOpenCoffeeModal,
      theme: propTheme,
      setTheme: propSetTheme,
      mounted: propMounted,
    }) => {
  const dict = useDictionary();
  const themeContext = useTheme();
  const theme = propTheme ?? themeContext.theme;
  const setTheme = propSetTheme ?? themeContext.setTheme;
  const pathname = usePathname();

  const [clientMounted, setClientMounted] = useState(false);
  const isMounted = propMounted ?? (propTheme !== undefined ? true : clientMounted);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  // Guards against a second locale switch landing while the first is still
  // in flight. `[locale]/layout.tsx` sits inside the dynamic locale segment
  // itself, so every switch re-runs the root layout on the server; stacking
  // several of those (a user mashing through pl -> de -> es before any one
  // lands) is the one window where the applied theme class can momentarily
  // drop out from under a still-resolving navigation. Blocking overlap here
  // is cheaper and more certain than trying to make every intermediate
  // frame themed. Cleared once `pathname` reflects the new locale.
  const [isSwitchingLang, setIsSwitchingLang] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useDismissOnOutsideOrEscape(isLangMenuOpen, langMenuRef, () => setIsLangMenuOpen(false));
  useDismissOnOutsideOrEscape(isThemeMenuOpen, themeMenuRef, () => setIsThemeMenuOpen(false));

  const lightLabel = dict.sidebar.themeLight;
  const lightLemonLabel = dict.sidebar.themeLightLemon;
  const darkLabel = dict.sidebar.themeDark;
  const systemLabel = dict.sidebar.themeSystem;

  // Short wordings for the narrow trigger button ("Light mode (Lemon)" -> "Lemon").
  const THEME_OPTIONS: { id: ThemeOptionId; label: string; short: string; icon: React.ReactNode }[] = [
    { id: 'light', label: lightLabel, short: dict.sidebar.themeLightShort, icon: <Sun className="h-4 w-4" /> },
    { id: 'light-lemon', label: lightLemonLabel, short: dict.sidebar.themeLightLemonShort, icon: <Citrus className="h-4 w-4" /> },
    { id: 'dark', label: darkLabel, short: dict.sidebar.themeDarkShort, icon: <Moon className="h-4 w-4" /> },
    { id: 'system', label: systemLabel, short: dict.sidebar.themeSystemShort, icon: <Laptop className="h-4 w-4" /> },
  ];
  const currentThemeOption =
    THEME_OPTIONS.find((t) => t.id === theme) ?? THEME_OPTIONS.find((t) => t.id === 'system')!;

  const currentLanguage =
    LANGUAGES.find((l) => l.code === currentLocale) ?? LANGUAGES[0];

  // Read the query string from the URL rather than useSearchParams().
  //
  // This component sits in the Sidebar, which every page renders, so an
  // unsuspended useSearchParams() opted *every route in the app* out of static
  // prerendering (and made the streaks routes fail the build outright once the
  // layout stopped bailing out early on a null dictionary). The language menu
  // only renders after a click, so `window.location.search` is always available
  // where this is actually used, and it never runs during prerender.
  const redirectedPathName = (locale: string) => {
    if (!pathname) return '/';
    const segments = pathname.split('/');
    segments[1] = locale;
    const query = typeof window !== 'undefined' ? window.location.search : '';
    return segments.join('/') + query;
  };

  useEffect(() => {
    setClientMounted(true);
  }, []);

  // The in-flight navigation has landed once the URL reflects it; release
  // the guard so the next switch is allowed.
  useEffect(() => {
    setIsSwitchingLang(false);
  }, [pathname]);

  return (
    <div className="space-y-2 pt-3 mt-3 border-t border-border-color">
      {/* Language & Theme Controls */}
      <div className="grid grid-cols-2 gap-2">
        <div ref={langMenuRef} className="relative">
          <button
            type="button"
            onClick={() => !isSwitchingLang && setIsLangMenuOpen((v) => !v)}
            aria-label={dict.sidebar.switchLanguage}
            aria-haspopup="listbox"
            aria-expanded={isLangMenuOpen}
            aria-disabled={isSwitchingLang}
            className={`pointer-coarse:min-h-11 pointer-coarse:min-w-11 flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-border-color bg-bg-elevated/50 text-xs font-semibold text-text-secondary hover:bg-bg-elevated transition-colors cursor-pointer ${FOCUS_RING} ${isSwitchingLang ? 'pointer-events-none opacity-60' : ''}`}
          >
            <FlagIcon code={currentLanguage.code} />
            <span className="uppercase">{currentLanguage.code}</span>
          </button>

          {isLangMenuOpen && (
            <div
              role="listbox"
              className="absolute bottom-full left-0 z-50 mb-2 w-44 overflow-hidden rounded-xl border border-border-color bg-bg-surface shadow-lg"
            >
              {LANGUAGES.map((lang) => (
                <Link
                  key={lang.code}
                  href={redirectedPathName(lang.code)}
                  role="option"
                  aria-selected={lang.code === currentLocale}
                  onClick={(e) => {
                    if (isSwitchingLang) {
                      e.preventDefault();
                      return;
                    }
                    setIsSwitchingLang(true);
                    setIsLangMenuOpen(false);
                  }}
                  className={
                    `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors ${FOCUS_RING} ` +
                    (lang.code === currentLocale
                      ? 'bg-accent-red/10 text-accent-red'
                      : 'text-text-secondary hover:bg-bg-elevated')
                  }
                >
                  <FlagIcon code={lang.code} className="h-4 w-[22px] rounded-sm shrink-0" />
                  <span>{lang.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Theme picker -- a dropdown list, mirroring the language switcher
            to its left, instead of an icon-row switch. */}
        <div ref={themeMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsThemeMenuOpen((v) => !v)}
            aria-label={dict.sidebar.toggleTheme}
            aria-haspopup="listbox"
            aria-expanded={isThemeMenuOpen}
            className={`pointer-coarse:min-h-11 pointer-coarse:min-w-11 flex h-8 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border-color bg-bg-elevated/50 px-2 text-xs font-semibold text-text-secondary hover:bg-bg-elevated transition-colors cursor-pointer ${FOCUS_RING}`}
          >
            {/* The stored theme is only known after mount; the server always
                renders the "system" icon, so the client must too until then
                (a Moon vs Laptop swap here was React hydration error #418 on
                every fully prerendered page for dark / lemon users). */}
            <span className="shrink-0">
              {isMounted ? currentThemeOption.icon : THEME_OPTIONS[THEME_OPTIONS.length - 1].icon}
            </span>
            <FitText minScale={0.8} alternatives={isMounted ? [currentThemeOption.short] : undefined} className="min-w-0 text-center">{isMounted ? currentThemeOption.label : ''}</FitText>
          </button>

          {isThemeMenuOpen && (
            <div
              role="listbox"
              aria-label={dict.sidebar.toggleTheme}
              className="absolute bottom-full right-0 z-50 mb-2 w-56 overflow-hidden rounded-xl border border-border-color bg-bg-surface shadow-lg"
            >
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={isMounted && theme === opt.id}
                  onClick={() => {
                    setTheme(opt.id);
                    setIsThemeMenuOpen(false);
                  }}
                  {...tip(opt.label, undefined, 'action')} aria-label={opt.label}
                  className={
                    `flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${FOCUS_RING} ` +
                    (isMounted && theme === opt.id
                      ? 'bg-accent-red/10 text-accent-red'
                      : 'text-text-secondary hover:bg-bg-elevated')
                  }
                >
                  <span className="shrink-0">{opt.icon}</span>
                  <span className="whitespace-nowrap">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bug Report & Buy Coffee */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenBugModal}
          aria-label={dict.sidebar.reportBug}
          className={`flex min-h-8 items-center justify-center gap-1.5 rounded-xl border border-border-color bg-bg-elevated/50 px-2 py-1.5 text-mini font-semibold text-text-secondary hover:bg-bg-elevated transition-colors cursor-pointer ${FOCUS_RING}`}
        >
          <FogReportIcon className="h-3.5 w-3.5 shrink-0 text-accent-red" />
          <FitText minScale={0.6} maxLines={2} className="min-w-0 text-center">{dict.sidebar.reportBug}</FitText>
        </button>

        <button
          type="button"
          onClick={onOpenCoffeeModal}
          aria-label={dict.sidebar.buyCoffee}
          className={`flex min-h-8 items-center justify-center gap-1.5 rounded-xl border border-border-color bg-bg-elevated/50 px-2 py-1.5 text-mini font-semibold text-text-secondary hover:bg-bg-elevated transition-colors cursor-pointer ${FOCUS_RING}`}
        >
          <CampfireMugIcon className="h-3.5 w-3.5 shrink-0 text-accent-amber" />
          <FitText minScale={0.6} maxLines={2} className="min-w-0 text-center">{dict.sidebar.buyCoffee}</FitText>
        </button>
      </div>
    </div>
  );
};
