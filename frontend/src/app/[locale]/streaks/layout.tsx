'use client';
// frontend/src/app/[locale]/streaks/layout.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, usePathname } from 'next/navigation';
import { Lock, MailWarning, Swords } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { RoleTabs } from '@/components/streaks/RoleTabs';
import { StreaksHubSkeleton } from '@/components/streaks/StreaksSkeleton';
import { Locale } from '@/i18n/config';
import { useAuth } from '@/context/AuthContext';
import { StreaksDictProvider } from '@/context/StreaksDictContext';
import { DisplayNamesProvider } from '@/context/DisplayNamesContext';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const QuestsModal = dynamic(() => import('@/components/QuestsModal').then((m) => m.QuestsModal), { ssr: false });
const AuthModal = dynamic(() => import('@/components/AuthModal').then((m) => m.AuthModal), { ssr: false });

export default function StreaksLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalIntent, setAuthModalIntent] = useState<'login' | 'verify'>('login');

  const dict = useDictionary();
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);


  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useDocumentTitle(dict?.app?.streaksPageTitle || 'LemonDBD - Challenges');

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="streaks"
        onSelectCategory={handleSelectCategory}
        onOpenQuests={() => setIsQuestsOpen(true)}
      />

      <main
        className="flex-1 w-full overflow-y-auto transition-[padding] duration-300 p-5 sm:p-7 lg:p-9 lemon-shell-main"
      >
        {isPickerPage && (
          <>
            <header className="mb-6 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                <Swords className="h-4 w-4" />
              </span>
              <h1 className="text-2xl font-extrabold tracking-wide text-slate-900 dark:text-slate-100">
                {dict?.sidebar?.challenges || 'Challenges'}
              </h1>
            </header>

            <div className="mb-6">
              <RoleTabs locale={locale} dict={dict} />
            </div>
          </>
        )}

        {authLoading ? (
          <p className="py-10 text-center text-xs text-slate-500">
            {dict?.streaks?.loadingStreak || 'Loading…'}
          </p>
        ) : isAuthenticated && user?.is_verified ? (
          <StreaksDictProvider dict={dict}>
            <DisplayNamesProvider locale={locale}>{children}</DisplayNamesProvider>
          </StreaksDictProvider>
        ) : isAuthenticated ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/20 bg-slate-900/60">
              <MailWarning className="h-5 w-5 text-amber-500/70" />
            </div>
            <h2 className="mt-4 text-sm font-extrabold tracking-wide text-slate-300">
              {dict?.streaks?.verifyEmailToTrack || 'Verify your email to track challenges'}
            </h2>
            <button
              onClick={() => {

                setAuthModalIntent('verify');
                setIsAuthModalOpen(true);
              }}
              className="mt-4 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-900/30 hover:bg-amber-500 transition-colors cursor-pointer"
            >
              {dict?.streaks?.verifyEmail || 'Verify email'}
            </button>
          </div>
        ) : (

          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-orange-500/20 bg-slate-900/60">
              <Lock className="h-5 w-5 text-orange-500/70" />
            </div>
            <h2 className="mt-4 text-sm font-extrabold tracking-wide text-slate-300">
              {dict?.streaks?.loginToTrack || 'Log in to track your challenges'}
            </h2>
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
              {dict?.streaks?.loginToTrackDesc || 'Challenges use the killers and perks you own, so we need to know who you are first.'}
            </p>
            <button
              onClick={() => {

                setAuthModalIntent('login');
                setIsAuthModalOpen(true);
              }}
              className="mt-5 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-900/30 hover:bg-orange-500 transition-colors"
            >
              {dict?.streaks?.logIn || 'Log in'}
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
