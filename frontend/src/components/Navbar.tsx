'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, Languages, Flame, Trophy, Scroll, Users, Calculator, Wand2, Compass, Layers, Package, Gamepad2 } from 'lucide-react';

interface NavbarProps {
  currentLocale: string;
  dict: any;
  onOpenQuests?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentLocale, dict, onOpenQuests }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  const toggleLocale = currentLocale === 'en' ? 'es' : 'en';

  const redirectedPathName = (locale: string) => {
    if (!pathname) return '/';
    const segments = pathname.split('/');
    segments[1] = locale;
    return segments.join('/');
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          {/* Brand Logo */}
          <Link href={'/' + currentLocale} className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-900 text-white shadow-lg shadow-red-900/30 group-hover:scale-105 transition-transform">
              <Flame className="h-5 w-5 text-red-100 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-wider text-slate-900 dark:text-slate-100 font-mono">
                  {dict.app.title}
                </span>
                <span className="rounded bg-red-600/10 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 border border-red-500/20">
                  PRO
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {dict.app.subtitle}
              </p>
            </div>
          </Link>

          {/* Main Navigation */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-2">
            <Link
              href={'/' + currentLocale}
              className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ' +
                (pathname === '/' + currentLocale || pathname === '/' + currentLocale + '/'
                  ? 'bg-slate-200/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900/60')
              }
            >
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span>Perks</span>
            </Link>

            <Link
              href={'/' + currentLocale + '/challenge'}
              className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ' +
                (pathname?.includes('/challenge')
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm'
                  : 'text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20')
              }
            >
              <span>⚡ Challenge</span>
            </Link>

            <Link
              href={'/' + currentLocale + '/draft'}
              className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ' +
                (pathname?.includes('/draft')
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm'
                  : 'text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20')
              }
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>Draft Room</span>
            </Link>

            <Link
              href={'/' + currentLocale + '/swf'}
              className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ' +
                (pathname?.includes('/swf')
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                  : 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20')
              }
            >
              <Users className="h-3.5 w-3.5" />
              <span>SWF Planner</span>
            </Link>

            <Link
              href={'/' + currentLocale + '/killer-calculator'}
              className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ' +
                (pathname?.includes('/killer-calculator')
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm'
                  : 'text-purple-500 hover:text-purple-400 hover:bg-purple-500/10 border border-purple-500/20')
              }
            >
              <Calculator className="h-3.5 w-3.5" />
              <span>Killer Calc</span>
            </Link>

            <Link
              href={'/' + currentLocale + '/builds'}
              className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ' +
                (pathname?.includes('/builds')
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-sm'
                  : 'text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-red-500/20')
              }
            >
              <span>🔥 Build Vault</span>
            </Link>

            <Link
              href={'/' + currentLocale + '/custom-perks'}
              className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ' +
                (pathname?.includes('/custom-perks')
                  ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20 shadow-sm'
                  : 'text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 border border-pink-500/20')
              }
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>Perk Studio</span>
            </Link>

            <Link
              href={'/' + currentLocale + '/maps'}
              className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ' +
                (pathname?.includes('/maps')
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                  : 'text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20')
              }
            >
              <Compass className="h-3.5 w-3.5 text-cyan-400" />
              <span>Map Explorer</span>
            </Link>

            <Link
              href={'/' + currentLocale + '/items'}
              className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ' +
                (pathname?.includes('/items')
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-sm'
                  : 'text-teal-500 hover:text-teal-400 hover:bg-teal-500/10 border border-teal-500/20')
              }
            >
              <Package className="h-3.5 w-3.5 text-teal-400" />
              <span>Items & Add-ons</span>
            </Link>

            <Link
              href={'/' + currentLocale + '/characters'}
              className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ' +
                (pathname?.includes('/characters') && !pathname?.includes('/guesser')
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                  : 'text-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/20')
              }
            >
              <Users className="h-3.5 w-3.5 text-indigo-400" />
              <span>Characters Hub</span>
            </Link>

            <Link
              href={'/' + currentLocale + '/characters/guesser'}
              className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ' +
                (pathname?.includes('/guesser')
                  ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-sm'
                  : 'text-violet-500 hover:text-violet-400 hover:bg-violet-500/10 border border-violet-500/20')
              }
            >
              <Gamepad2 className="h-3.5 w-3.5 text-violet-400" />
              <span>{dict.guesser?.navLink || 'Guesser'}</span>
            </Link>



            {onOpenQuests && (
              <button
                onClick={onOpenQuests}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-all cursor-pointer"
              >
                <Scroll className="h-3.5 w-3.5 text-amber-400" />
                <span>Quests</span>
              </button>
            )}
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Locale Switcher */}
          <Link
            href={redirectedPathName(toggleLocale)}
            aria-label="Toggle Language"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <Languages className="h-3.5 w-3.5 text-red-500" />
            <span className="uppercase tracking-wider">{toggleLocale}</span>
          </Link>

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle Theme"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100/50 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isMounted && resolvedTheme === 'dark' ? (
              <Moon className="h-4 w-4 text-slate-300" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
