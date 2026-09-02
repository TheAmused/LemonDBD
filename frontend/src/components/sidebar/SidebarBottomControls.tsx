'use client';
// frontend/src/components/sidebar/SidebarBottomControls.tsx
import type { Dictionary } from '@/locales/types';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop, Bug, Coffee } from 'lucide-react';
import { FlagIcon } from './FlagIcon';

export const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'pl', label: 'Polski' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' },
];

export interface SidebarBottomControlsProps {
  currentLocale: string;
  dict?: Dictionary;
  onOpenBugModal: () => void;
  onOpenCoffeeModal: () => void;
  theme?: string;
  setTheme?: (theme: string) => void;
  mounted?: boolean;
}

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

  const lightLabel = dict?.sidebar?.themeLight || 'Light mode';
  const darkLabel = dict?.sidebar?.themeDark || 'Dark mode';
  const systemLabel = dict?.sidebar?.themeSystem || 'System theme';

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

  useEffect(() => {
    if (!isLangMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        langMenuRef.current &&
        !langMenuRef.current.contains(e.target as Node)
      ) {
        setIsLangMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLangMenuOpen(false);
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLangMenuOpen]);

  return (
    <div className="space-y-2 pt-3 mt-3 border-t border-slate-200/80 dark:border-slate-800/80">
      {/* Language & Theme Controls */}
      <div className="grid grid-cols-2 gap-2">
        <div ref={langMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsLangMenuOpen((v) => !v)}
            aria-label={dict?.sidebar?.switchLanguage || 'Switch Language'}
            aria-haspopup="listbox"
            aria-expanded={isLangMenuOpen}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/50 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <FlagIcon code={currentLanguage.code} />
            <span className="uppercase">{currentLanguage.code}</span>
          </button>

          {isLangMenuOpen && (
            <div
              role="listbox"
              className="absolute bottom-full left-0 z-50 mb-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              {LANGUAGES.map((lang) => (
                <Link
                  key={lang.code}
                  href={redirectedPathName(lang.code)}
                  role="option"
                  aria-selected={lang.code === currentLocale}
                  onClick={() => setIsLangMenuOpen(false)}
                  className={
                    'flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors ' +
                    (lang.code === currentLocale
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')
                  }
                >
                  <FlagIcon code={lang.code} className="h-4 w-[22px] rounded-sm shrink-0" />
                  <span>{lang.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 3-State Theme Switcher (Light / Dark / System) */}
        <div
          role="group"
          aria-label={dict?.sidebar?.toggleTheme || 'Theme selector'}
          className="flex h-8 items-center justify-between rounded-xl border border-slate-200 bg-slate-100/50 p-0.5 dark:border-slate-800 dark:bg-slate-900/50"
        >
          <button
            type="button"
            onClick={() => setTheme('light')}
            aria-label={lightLabel} /* i18n-ignore */
            aria-pressed={isMounted && theme === 'light'}
            title={lightLabel} /* i18n-ignore */
            className={`relative before:absolute before:-inset-1 before:content-[''] flex flex-1 h-full items-center justify-center rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-amber-500 dark:focus-visible:ring-cyan-400 ${
              isMounted && theme === 'light'
                ? 'bg-white text-amber-500 shadow-xs dark:bg-slate-800 dark:text-amber-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            aria-label={darkLabel} /* i18n-ignore */
            aria-pressed={isMounted && theme === 'dark'}
            title={darkLabel} /* i18n-ignore */
            className={`relative before:absolute before:-inset-1 before:content-[''] flex flex-1 h-full items-center justify-center rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-amber-500 dark:focus-visible:ring-cyan-400 ${
              isMounted && theme === 'dark'
                ? 'bg-white text-cyan-500 shadow-xs dark:bg-slate-800 dark:text-cyan-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Moon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTheme('system')}
            aria-label={systemLabel} /* i18n-ignore */
            aria-pressed={isMounted && theme === 'system'}
            title={systemLabel} /* i18n-ignore */
            className={`relative before:absolute before:-inset-1 before:content-[''] flex flex-1 h-full items-center justify-center rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-amber-500 dark:focus-visible:ring-cyan-400 ${
              isMounted && theme === 'system'
                ? 'bg-white text-slate-700 shadow-xs dark:bg-slate-800 dark:text-slate-200'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Laptop className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Bug Report & Buy Coffee */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenBugModal}
          aria-label={dict?.sidebar?.reportBug || 'Report Bug'}
          className="flex min-h-8 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/50 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Bug className="h-3.5 w-3.5 shrink-0 text-rose-500" />
          <span className="text-center">{dict?.sidebar?.reportBug || 'Report Bug'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenCoffeeModal}
          aria-label={dict?.sidebar?.buyCoffee || 'Buy Coffee'}
          className="flex min-h-8 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/50 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Coffee className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="text-center">{dict?.sidebar?.buyCoffee || 'Buy Coffee'}</span>
        </button>
      </div>
    </div>
  );
};

