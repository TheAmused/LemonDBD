// frontend/src/components/sidebar/SidebarBottomControls.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, Bug, Coffee } from 'lucide-react';
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
  dict?: any;
  onOpenBugModal: () => void;
  onOpenCoffeeModal: () => void;
}

export const SidebarBottomControls: React.FC<SidebarBottomControlsProps> = ({
  currentLocale,
  dict,
  onOpenBugModal,
  onOpenCoffeeModal,
}) => {
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();

  const [isMounted, setIsMounted] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const currentLanguage =
    LANGUAGES.find((l) => l.code === currentLocale) ?? LANGUAGES[0];

  const redirectedPathName = (locale: string) => {
    if (!pathname) return '/';
    const segments = pathname.split('/');
    segments[1] = locale;
    return segments.join('/');
  };

  useEffect(() => {
    setIsMounted(true);
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

        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label={dict?.sidebar?.toggleTheme || 'Toggle Dark Mode'}
          className="flex h-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-100/50 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {isMounted && resolvedTheme === 'dark' ? (
            <Moon className="h-3.5 w-3.5 text-slate-300" />
          ) : (
            <Sun className="h-3.5 w-3.5 text-amber-500" />
          )}
        </button>
      </div>

      {/* Bug Report & Buy Coffee */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenBugModal}
          aria-label={dict?.sidebar?.reportBug || 'Report Bug'}
          className="flex h-8 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/50 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Bug className="h-3.5 w-3.5 text-rose-500" />
          <span>{dict?.sidebar?.reportBug || 'Report Bug'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenCoffeeModal}
          aria-label={dict?.sidebar?.buyCoffee || 'Buy Coffee'}
          className="flex h-8 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/50 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Coffee className="h-3.5 w-3.5 text-amber-500" />
          <span>{dict?.sidebar?.buyCoffee || 'Buy Coffee'}</span>
        </button>
      </div>
    </div>
  );
};

