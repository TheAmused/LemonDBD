'use client';
// frontend/src/components/streaks/StreaksLayoutShell.tsx

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { MailWarning } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { RoleTabs } from '@/components/streaks/RoleTabs';
import { StreaksHubSkeleton } from '@/components/streaks/StreaksSkeleton';
import { Locale } from '@/i18n/config';
import { useAuth } from '@/context/AuthContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { mustConfirmEmail } from '@/utils/emailVerification';
import { DisplayNamesProvider } from '@/context/DisplayNamesContext';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { getBackendBaseUrl } from '@/utils/api';

import { Button } from '@/components/common/Button';
import { AuthRequiredState } from '@/components/common/AuthRequiredState';
import { IconTile } from '@/components/common/IconTile';
const AuthModal = dynamic(() => import('@/components/AuthModal').then((m) => m.AuthModal), { ssr: false });

export function StreaksLayoutShell({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const verificationRequired = useSiteConfig().features.emailVerificationRequired;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalIntent, setAuthModalIntent] = useState<'login' | 'verify'>('login');

  const dict = useDictionary();


  const backendBase = getBackendBaseUrl();


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
    <div className="min-h-screen text-text-primary flex flex-col lg:flex-row transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        activeCategory="streaks"
        onSelectCategory={handleSelectCategory}
      />

      <main
        className="flex-1 w-full overflow-y-auto transition-[padding] duration-300 p-5 sm:p-7 lg:p-9 lemon-shell-main"
      >
        {isPickerPage && (
          <div className="mb-6">
            <RoleTabs locale={locale} />
          </div>
        )}

        {authLoading ? (
          <p className="py-10 text-center text-xs text-text-muted">
            {dict.streaks.loadingStreak}
          </p>
        ) : isAuthenticated && user && !mustConfirmEmail(user, verificationRequired) ? (
          <DisplayNamesProvider locale={locale}>{children}</DisplayNamesProvider>
        ) : isAuthenticated ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border-color bg-bg-surface/60 px-6 py-20 text-center">
            <IconTile tone="amber" size="md">
              <MailWarning className="h-5 w-5 text-accent-amber" />
            </IconTile>
            <h2 className="mt-4 text-sm font-extrabold tracking-wide text-text-primary">
              {dict.streaks.verifyEmailToTrack}
            </h2>
            <Button
              onClick={() => {

                setAuthModalIntent('verify');
                setIsAuthModalOpen(true);
              }}
              variant="primary" size="md" className="mt-4"
            >
              {dict.streaks.verifyEmail}
            </Button>
          </div>
        ) : (

          <AuthRequiredState
            title={dict.streaks.loginToTrack}
            subtitle={dict.streaks.loginToTrackDesc}
            buttonLabel={dict.streaks.logIn}
          />
        )}


        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          verifyEmailFor={authModalIntent === 'verify' ? user?.email : undefined}
        />
      </main>
    </div>
  );
}
