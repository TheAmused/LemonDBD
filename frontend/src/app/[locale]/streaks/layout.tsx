// frontend/src/app/[locale]/streaks/layout.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { Lock, MailWarning, Swords } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { QuestsModal } from '@/components/QuestsModal';
import { AuthModal } from '@/components/AuthModal';
import { RoleTabs } from '@/components/streaks/RoleTabs';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';
import { useAuth } from '@/context/AuthContext';

export default function StreaksLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const pathname = usePathname();
  const { isCollapsed } = useSidebarState();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalIntent, setAuthModalIntent] = useState<'login' | 'verify'>('login');

  const [dict, setDict] = useState<any>(null);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);

  const [totalPerksCount, setTotalPerksCount] = useState<number>(0);
  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    document.title = 'LemonDBD - Challenges';
    getDictionary(locale)
      .then(setDict)
      .catch((err) => console.error('Failed to load streaks dictionary:', err));
  }, [locale]);

  useEffect(() => {
    async function loadVaultStats() {
      try {
        const [perksRes, charsRes] = await Promise.all([
          fetch(`${backendBase}/api/v1/perks?limit=1000`),
          fetch(`${backendBase}/api/v1/characters`),
        ]);
        if (perksRes.ok) {
          const pData = await perksRes.json();
          const list = pData.data || [];
          setTotalPerksCount(pData.pagination?.total || list.length);
          setSurvivorCount(list.filter((p: any) => p.category === 'Survivor').length);
          setKillerCount(list.filter((p: any) => p.category === 'Killer').length);
        }
        if (charsRes.ok) {
          const cData = await charsRes.json();
          setCharacterCount(cData.count || (cData.data || []).length);
        }
      } catch (err) {
        console.error('Failed to load sidebar vault stats:', err);
      }
    }
    loadVaultStats();
  }, [backendBase]);

  const handleSelectCategory = () => {
    if (typeof window !== 'undefined') {
      window.location.href = `/${locale}`;
    }
  };

  // The picker (role, then which challenge) lives at /streaks and /streaks/[role].
  // Anything deeper is an actual challenge in progress, where this heading and
  // the role tabs no longer apply.
  const segmentsAfterStreaks = (pathname || '')
    .split('/')
    .filter(Boolean)
    .slice(2); // drop the locale and "streaks" segments
  const isPickerPage = segmentsAfterStreaks.length <= 1;

  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="streaks"
        onSelectCategory={handleSelectCategory}
        onOpenQuests={() => setIsQuestsOpen(true)}
        totalPerksCount={totalPerksCount}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />

      <main
        className={`flex-1 w-full overflow-y-auto transition-all duration-300 p-5 sm:p-7 lg:p-9 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        {isPickerPage && (
          <>
            <header className="mb-6 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                <Swords className="h-4 w-4" />
              </span>
              <h1 className="text-2xl font-extrabold tracking-wide text-slate-900 dark:text-slate-100">Challenges</h1>
            </header>

            <div className="mb-6">
              <RoleTabs locale={locale} />
            </div>
          </>
        )}

        {authLoading ? (
          <p className="py-10 text-center text-xs text-slate-500">Loading…</p>
        ) : isAuthenticated && user?.is_verified ? (
          children
        ) : isAuthenticated ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/20 bg-slate-900/60">
              <MailWarning className="h-5 w-5 text-amber-500/70" />
            </div>
            <h2 className="mt-4 text-sm font-extrabold tracking-wide text-slate-300">
              Verify your email to track challenges
            </h2>
            <button
              onClick={() => {
                setAuthModalIntent('verify');
                setIsAuthModalOpen(true);
              }}
              className="mt-4 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-900/30 hover:bg-amber-500 transition-colors cursor-pointer"
            >
              Verify email
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-orange-500/20 bg-slate-900/60">
              <Lock className="h-5 w-5 text-orange-500/70" />
            </div>
            <h2 className="mt-4 text-sm font-extrabold tracking-wide text-slate-300">
              Log in to track your challenges
            </h2>
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
              Challenges use the killers and perks you own, so we need to know who you are first.
            </p>
            <button
              onClick={() => {
                setAuthModalIntent('login');
                setIsAuthModalOpen(true);
              }}
              className="mt-5 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-900/30 hover:bg-orange-500 transition-colors"
            >
              Log in
            </button>
          </div>
        )}

        <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          verifyEmailFor={authModalIntent === 'verify' ? user?.email : undefined}
        />
      </main>
    </div>
  );
}
