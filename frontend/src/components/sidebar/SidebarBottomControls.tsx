'use client';
// frontend/src/components/sidebar/SidebarBottomControls.tsx
import type { Dictionary } from '@/locales/types';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop, Bug, Coffee, Citrus } from 'lucide-react';
import { FlagIcon } from './FlagIcon';

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
  dict?: Dictionary;
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

const FOCUS_RING = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber';

export const SidebarBottomControls: React.FC<SidebarBottomControlsProps> = ({
  currentLocale,
  dict,
  onOpenBugModal,
  onOpenCoffeeModal,
  theme: propTheme,
  setTheme: propSetTheme,
  mounted: propMounted,
}) => {
  const themeContext = useTheme();
  const theme = propTheme ?? themeContext.theme;
  const setTheme = propSetTheme ?? themeContext.setTheme;
  const pathname = usePathname();

  const [clientMounted, setClientMounted] = useState(false);
  const isMounted = propMounted ?? (propTheme !== undefined ? true : clientMounted);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useDismissOnOutsideOrEscape(isLangMenuOpen, langMenuRef, () => setIsLangMenuOpen(false));
  useDismissOnOutsideOrEscape(isThemeMenuOpen, themeMenuRef, () => setIsThemeMenuOpen(false));

  const lightLabel = dict?.sidebar?.themeLight || 'Light mode';
  const lightLemonLabel = dict?.sidebar?.themeLightLemon || 'Light mode (Lemon)';
  const darkLabel = dict?.sidebar?.themeDark || 'Dark mode';
  const systemLabel = dict?.sidebar?.themeSystem || 'System theme';

  const THEME_OPTIONS: { id: ThemeOptionId; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: lightLabel, icon: <Sun className="h-4 w-4" /> },
    { id: 'light-lemon', label: lightLemonLabel, icon: <Citrus className="h-4 w-4" /> },
    { id: 'dark', label: darkLabel, icon: <Moon className="h-4 w-4" /> },
    { id: 'system', label: systemLabel, icon: <Laptop className="h-4 w-4" /> },
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

  return (
    <div className="space-y-2 pt-3 mt-3 border-t border-border-color">
      {/* Language & Theme Controls */}
      <div className="grid grid-cols-2 gap-2">
        <div ref={langMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsLangMenuOpen((v) => !v)}
            aria-label={dict?.sidebar?.switchLanguage || 'Switch Language'}
            aria-haspopup="listbox"
            aria-expanded={isLangMenuOpen}
            className={`flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-border-color bg-bg-elevated/50 text-xs font-semibold text-text-secondary hover:bg-bg-elevated transition-colors cursor-pointer ${FOCUS_RING}`}
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
                  onClick={() => setIsLangMenuOpen(false)}
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
            aria-label={dict?.sidebar?.toggleTheme || 'Theme selector'}
            aria-haspopup="listbox"
            aria-expanded={isThemeMenuOpen}
            className={`flex h-8 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border-color bg-bg-elevated/50 px-2 text-xs font-semibold text-text-secondary hover:bg-bg-elevated transition-colors cursor-pointer ${FOCUS_RING}`}
          >
            <span className="shrink-0">{currentThemeOption.icon}</span>
            <span className="min-w-0 truncate">{isMounted ? currentThemeOption.label : ''}</span>
          </button>

          {isThemeMenuOpen && (
            <div
              role="listbox"
              aria-label={dict?.sidebar?.toggleTheme || 'Theme selector'}
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
                  title={opt.label} /* i18n-ignore */
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
          aria-label={dict?.sidebar?.reportBug || 'Report Bug'}
          className={`flex min-h-8 items-center justify-center gap-1.5 rounded-xl border border-border-color bg-bg-elevated/50 px-2 py-1.5 text-[11px] font-semibold text-text-secondary hover:bg-bg-elevated transition-colors cursor-pointer ${FOCUS_RING}`}
        >
          <Bug className="h-3.5 w-3.5 shrink-0 text-rose-500" />
          <span className="text-center">{dict?.sidebar?.reportBug || 'Report Bug'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenCoffeeModal}
          aria-label={dict?.sidebar?.buyCoffee || 'Buy Coffee'}
          className={`flex min-h-8 items-center justify-center gap-1.5 rounded-xl border border-border-color bg-bg-elevated/50 px-2 py-1.5 text-[11px] font-semibold text-text-secondary hover:bg-bg-elevated transition-colors cursor-pointer ${FOCUS_RING}`}
        >
          <Coffee className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="text-center">{dict?.sidebar?.buyCoffee || 'Buy Coffee'}</span>
        </button>
      </div>
    </div>
  );
};
