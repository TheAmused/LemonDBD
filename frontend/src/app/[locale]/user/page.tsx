'use client';

import type { Dictionary } from '@/locales/types';
// frontend/src/app/[locale]/user/page.tsx

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LemonIcon } from '@/components/LemonIcon';
import { PageShell } from '@/components/layout/PageShell';
import { CampfireHeader } from '@/components/user/CampfireHeader';
import { DualMainsShowcase } from '@/components/user/DualMainsShowcase';
import { UserProfileForm } from '@/components/user/UserProfileForm';
import { UserBugReportsDrawer } from '@/components/user/UserBugReportsDrawer';
import { UserProfileSkeleton } from '@/components/user/UserProfileSkeleton';
import { UserCampfireParticles } from '@/components/user/UserCampfireParticles';
import { Locale } from '@/i18n/config';
import { UserBugReport, StatusFeedback } from '@/types/userProfile';
import { fetchMyBugReports, uploadAvatar, resetAvatar, ApiError } from '@/services/userProfileApi';
import { useUserShowcase } from '@/hooks/useUserShowcase';
import {
  User,
  Trash2,
} from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

// Modals are only needed once the user interacts (sign-in prompt, bug report
// form) -- code-split them out of the initial /user bundle. `ssr: false`
// because both hold client-only state (file inputs, altcha, portals).
const AuthModal = dynamic(() => import('@/components/AuthModal').then((m) => m.AuthModal), {
  ssr: false,
});
const BugReportModal = dynamic(
  () => import('@/components/sidebar/BugReportModal').then((m) => m.BugReportModal),
  { ssr: false }
);

export default function UserProfilePage() {
  const params = useParams();
  const currentLocale = (params?.locale as Locale) || 'en';
  const { user, isAuthenticated, isLoading, ownership, refreshUser } = useAuth();

  const dict = useDictionary();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);

  // Showcase state with database persistence
  const showcaseHook = useUserShowcase(user?.id);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [optimisticPreview, setOptimisticPreview] = useState<string | null>(null);
  const [avatarFeedback, setAvatarFeedback] = useState<StatusFeedback | null>(null);

  const [myReports, setMyReports] = useState<UserBugReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsTotalPages, setReportsTotalPages] = useState(1);
  const REPORTS_PER_PAGE = 10;

  useDocumentTitle(dict?.app?.userPageTitle || 'LemonDBD - User Profile');

  const fetchMyReports = useCallback(async (page: number = 1, signal?: AbortSignal) => {
    if (!isAuthenticated) return;

    setLoadingReports(true);
    try {
      const result = await fetchMyBugReports(page, REPORTS_PER_PAGE, signal);
      setMyReports(result.reports);
      setReportsTotal(result.total);
      setReportsPage(result.page);
      setReportsTotalPages(result.totalPages);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch user bug reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    fetchMyReports(1, controller.signal);
    return () => controller.abort();
  }, [isAuthenticated, fetchMyReports]);

  const handleReportsPageChange = useCallback(
    (page: number) => {
      fetchMyReports(page);
    },
    [fetchMyReports]
  );

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setAvatarFeedback({ type: 'error', text: dict?.user?.avatarSizeLimit || 'Avatar file size must be under 10MB.' });
      return;
    }

    const localBlobUrl = URL.createObjectURL(file);
    setOptimisticPreview(localBlobUrl);
    setIsUploadingAvatar(true);
    setAvatarFeedback(null);

    try {
      await uploadAvatar(file);
      setAvatarFeedback({ type: 'success', text: dict?.user?.avatarUpdateSuccess || 'Avatar updated successfully!' });
      await refreshUser();
      setOptimisticPreview(null);
    } catch (err: unknown) {
      setOptimisticPreview(null);
      const fallback = dict?.user?.avatarUploadFailed || 'Failed to upload avatar.';
      const errorMsg = err instanceof ApiError ? err.message || fallback : fallback;
      setAvatarFeedback({ type: 'error', text: errorMsg });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetAvatar = async () => {
    setIsUploadingAvatar(true);
    setAvatarFeedback(null);
    setOptimisticPreview(null);

    try {
      await resetAvatar();
      setAvatarFeedback({ type: 'success', text: dict?.user?.avatarResetSuccessMsg || 'Avatar reset to default.' });
      await refreshUser();
    } catch (err: unknown) {
      const fallback = dict?.user?.avatarResetFailed || 'Failed to reset avatar.';
      const errorMsg = err instanceof ApiError ? err.message || fallback : fallback;
      setAvatarFeedback({ type: 'error', text: errorMsg });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (!dict || isLoading) {
    return <UserProfileSkeleton dict={dict} />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col items-center justify-center p-6 text-center dbd-fog-overlay transition-colors duration-300">
        <div className="max-w-md w-full rounded-3xl border border-border-color bg-bg-surface text-text-primary p-8 backdrop-blur-xl shadow-xl space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-amber/15 border border-accent-amber/30">
            <LemonIcon className="h-10 w-10 text-accent-amber" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-wider font-mono text-text-primary">
            {dict?.user?.authRequiredTitle || 'Authentication Required'}
          </h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            {dict?.user?.authRequiredDesc || 'Please sign in or create an account to view your LemonDBD profile, manage your teachables, and track game challenges.'}
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent-red hover:bg-accent-red-hover py-3 text-xs font-black uppercase tracking-wider text-text-inverted shadow-md transition-all cursor-pointer font-mono"
            >
              <User className="h-4 w-4" />
              <span>{dict?.user?.signIn || 'Sign In / Register'}</span>
            </button>
            <Link
              href={`/${currentLocale}`}
              className="text-xs text-text-muted hover:text-accent-amber transition-colors py-1 font-mono"
            >
              {dict?.user?.returnToHome || 'Return to Home'}
            </Link>
          </div>
        </div>

        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} dict={dict} />
      </div>
    );
  }

  const hasCustomAvatar = Boolean(user.avatar_url && user.avatar_url !== 'default_avatar');

  return (
    <PageShell
      locale={currentLocale}
      dict={dict}
      activeCategory="user"
      mainClassName="overflow-y-auto relative"
    >
        <UserCampfireParticles />
        <div className="relative z-10 max-w-5xl xl:max-w-6xl 2xl:max-w-[1700px] 3xl:max-w-[2000px] w-full mx-auto space-y-6 sm:space-y-8 2xl:space-y-10 py-4 sm:py-6 lg:py-8 2xl:py-10">
          {/* Hidden avatar file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarFileChange}
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
          />

          {/* Campfire Header Card (Avatar + Info + Vault Mastery) */}
          <CampfireHeader
            user={user}
            showcase={showcaseHook.showcase}
            ownership={ownership}
            isSaving={showcaseHook.isSaving}
            saveError={showcaseHook.saveError}
            onTitleChange={showcaseHook.setPlayerTitle}
            onDevotionChange={showcaseHook.setDevotionLevel}
            onGradeRankChange={showcaseHook.setGradeRank}
            dict={dict}
            currentLocale={currentLocale}
            previewUrl={optimisticPreview}
            isUploadingAvatar={isUploadingAvatar}
            onAvatarClick={() => fileInputRef.current?.click()}
            avatarFeedback={avatarFeedback}
          />

          {/* Reset to Default Avatar Action when custom avatar is active */}
          {(hasCustomAvatar || optimisticPreview) && (
            <div className="flex justify-end -mt-2 sm:-mt-4">
              <button
                type="button"
                onClick={handleResetAvatar}
                disabled={isUploadingAvatar}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all cursor-pointer font-mono"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{dict?.user?.removeAvatar || 'Reset to Default Avatar'}</span>
              </button>
            </div>
          )}

          {/* 1. TOP BLOCK: Account Management */}
          <UserProfileForm
            initialEmail={user.email || ''}
            onRefreshUser={refreshUser}
            dict={dict}
          />

          {/* 2. MIDDLE BLOCK: Dual Mains Signature Showcase (Survivor & Killer Loadouts) */}
          <DualMainsShowcase
            showcase={showcaseHook.showcase}
            onSurvivorCharacterChange={showcaseHook.setSurvivorCharacter}
            onSurvivorPrestigeChange={showcaseHook.setSurvivorPrestige}
            onSurvivorPerkChange={showcaseHook.setSurvivorPerk}
            onKillerCharacterChange={showcaseHook.setKillerCharacter}
            onKillerPrestigeChange={showcaseHook.setKillerPrestige}
            onKillerPerkChange={showcaseHook.setKillerPerk}
            dict={dict}
            locale={currentLocale}
          />

          {/* 3. BOTTOM BLOCK: My Bug Reports */}
          <UserBugReportsDrawer
            reports={myReports}
            loading={loadingReports}
            onOpenReportModal={() => setBugModalOpen(true)}
            dict={dict}
            total={reportsTotal}
            page={reportsPage}
            perPage={REPORTS_PER_PAGE}
            totalPages={reportsTotalPages}
            onPageChange={handleReportsPageChange}
          />
        </div>

      <BugReportModal
        isOpen={bugModalOpen}
        onClose={() => {
          setBugModalOpen(false);
          fetchMyReports();
        }}
        dict={dict}
      />
    </PageShell>
  );
}
