'use client';
// frontend/src/components/user/UserProfileClient.tsx

import { logger } from '@/utils/logger';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/common/Button';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LemonIcon } from '@/components/LemonIcon';
import { CampfireHeader } from '@/components/user/CampfireHeader';
import { DualMainsShowcase } from '@/components/user/DualMainsShowcase';
import { UserProfileForm } from '@/components/user/UserProfileForm';
import { UserBugReportsDrawer } from '@/components/user/UserBugReportsDrawer';
import { UserProfileSkeleton } from '@/components/user/UserProfileSkeleton';
import type { UserBugReport, StatusFeedback } from '@/types/userProfile';
import { fetchMyBugReports, markBugReportSeen, uploadAvatar, ApiError } from '@/services/userProfileApi';
import { useUserShowcase } from '@/hooks/useUserShowcase';
import { User } from 'lucide-react';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { trackEvent } from '@/utils/analytics';
import { Surface } from '@/components/common/Surface';
import { IconTile } from '@/components/common/IconTile';

const AuthModal = dynamic(() => import('@/components/AuthModal').then((m) => m.AuthModal), {
  ssr: false,
});
const BugReportModal = dynamic(
  () => import('@/components/sidebar/BugReportModal').then((m) => m.BugReportModal),
  { ssr: false }
);

export function UserProfileClient() {
  const currentLocale = useLocale();
  const { user, isAuthenticated, isLoading, ownership, refreshUser } = useAuth();

  const dict = useDictionary();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);

  const showcaseHook = useUserShowcase(user?.id);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [optimisticPreview, setOptimisticPreview] = useState<string | null>(null);
  const [avatarFeedback, setAvatarFeedback] = useState<StatusFeedback | null>(null);

  const [myReports, setMyReports] = useState<UserBugReport[]>([]);
  // The first page loads with the profile; a page change shows as loading until its answer is in.
  const [firstReportsLoaded, setFirstReportsLoaded] = useState(false);
  const [pagingReports, setPagingReports] = useState(false);
  const loadingReports = pagingReports || (isAuthenticated && !firstReportsLoaded);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [unreadReports, setUnreadReports] = useState(0);
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsTotalPages, setReportsTotalPages] = useState(1);
  const REPORTS_PER_PAGE = 10;
  /** The request in flight: a newer page aborts it, so a slow answer can't overwrite a newer one. */
  const reportsRequestRef = useRef<AbortController | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  /**
   * Fetches one page of the reports; a newer request cancels the one in flight. State is set in its
   * callbacks. Resolves to whether this was still the newest request when it settled.
   */
  const fetchMyReports = useCallback((page: number = 1, signal?: AbortSignal): Promise<boolean> => {
    reportsRequestRef.current?.abort();
    const controller = new AbortController();
    reportsRequestRef.current = controller;
    signal?.addEventListener('abort', () => controller.abort());

    return fetchMyBugReports(page, REPORTS_PER_PAGE, controller.signal).then(
      (result) => {
        setMyReports(result.reports);
        setReportsTotal(result.total);
        setUnreadReports(result.unreadCount);
        setReportsPage(result.page);
        setReportsTotalPages(result.totalPages);
      },
      (err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        logger.error('Failed to fetch user bug reports:', err);
      }
    ).then(() => reportsRequestRef.current === controller);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    void fetchMyReports(1, controller.signal).finally(() => {
      if (!controller.signal.aborted) setFirstReportsLoaded(true);
    });
    return () => controller.abort();
  }, [isAuthenticated, fetchMyReports]);

  const handleReportsPageChange = useCallback(
    (page: number) => {
      if (!isAuthenticated) return;
      setPagingReports(true);
      void fetchMyReports(page).then((newest) => {
        if (newest) setPagingReports(false);
      });
    },
    [isAuthenticated, fetchMyReports]
  );

  // The local preview of an avatar being uploaded is a blob: URL; it is released once replaced.
  useEffect(() => {
    if (!optimisticPreview) return;
    return () => URL.revokeObjectURL(optimisticPreview);
  }, [optimisticPreview]);

  const handleReportSeen = useCallback((id: number) => {
    setMyReports((prev) => prev.map((r) => (r.id === id ? { ...r, feedback_unread: false } : r)));
    setUnreadReports((count) => Math.max(0, count - 1));
    markBugReportSeen(id).catch((err) => logger.error('Failed to mark bug report as seen:', err));
  }, []);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setAvatarFeedback({ type: 'error', text: dict.user.avatarSizeLimit });
      return;
    }

    const localBlobUrl = URL.createObjectURL(file);
    setOptimisticPreview(localBlobUrl);
    setIsUploadingAvatar(true);
    setAvatarFeedback(null);

    try {
      await uploadAvatar(file);
      trackEvent('avatar_upload');
      setAvatarFeedback({ type: 'success', text: dict.user.avatarUpdateSuccess });
      await refreshUser();
      setOptimisticPreview(null);
    } catch (err: unknown) {
      setOptimisticPreview(null);
      const fallback = dict.user.avatarUploadFailed;
      const errorMsg = err instanceof ApiError ? err.message || fallback : fallback;
      setAvatarFeedback({ type: 'error', text: errorMsg });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!dict || isLoading) {
    return <UserProfileSkeleton />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-skeleton-page flex-1 flex-col items-center justify-center p-6 text-center text-text-primary">
        <Surface padding="none" className="max-w-md w-full text-text-primary p-8 backdrop-blur-xl shadow-xl space-y-4">
          <IconTile tone="amber" size="lg" className="mx-auto">
            <LemonIcon className="h-10 w-10 text-accent-amber" />
          </IconTile>
          <h1 className="text-xl sm:text-2xl font-black tracking-wider text-text-primary">
            {dict.user.authRequiredTitle}
          </h1>
          <p className="type-body text-text-secondary">
            {dict.user.authRequiredDesc}
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="primary"
              onClick={() => setAuthModalOpen(true)}
              leftIcon={<User className="h-4 w-4" />}
              className="w-full"
            >
              <span>{dict.user.signIn}</span>
            </Button>
            <Link
              href={`/${currentLocale}`}
              className="text-xs text-text-muted hover:text-accent-amber transition-colors py-1 pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
            >
              {dict.user.returnToHome}
            </Link>
          </div>
        </Surface>

        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    );
  }

  return (
    <>
      <div className="relative z-10 max-w-5xl xl:max-w-6xl 2xl:max-w-profile 3xl:max-w-profile-xl w-full mx-auto space-y-6 sm:space-y-8 2xl:space-y-10 py-4 sm:py-6 lg:py-8 2xl:py-10">
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => { void handleAvatarFileChange(e); }}
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
        />

        <CampfireHeader
          user={user}
          showcase={showcaseHook.showcase}
          ownership={ownership}
          isSaving={showcaseHook.isSaving}
          saveError={showcaseHook.saveError}
          onTitleChange={showcaseHook.setPlayerTitle}
          onDevotionChange={showcaseHook.setDevotionLevel}
          onGradeRankChange={showcaseHook.setGradeRank}
          currentLocale={currentLocale}
          previewUrl={optimisticPreview}
          isUploadingAvatar={isUploadingAvatar}
          onAvatarClick={() => fileInputRef.current?.click()}
          avatarFeedback={avatarFeedback}
        />

        <UserProfileForm
          login={user.login}
          initialUsername={user.username}
          initialEmail={user.email || ''}
          twoFactorEnabled={Boolean(user.two_factor_enabled)}
          hasPassword={user.has_password !== false}
          onRefreshUser={refreshUser}
        />

        <DualMainsShowcase
          showcase={showcaseHook.showcase}
          onSurvivorCharacterChange={showcaseHook.setSurvivorCharacter}
          onSurvivorPrestigeChange={showcaseHook.setSurvivorPrestige}
          onSurvivorPerkChange={showcaseHook.setSurvivorPerk}
          onKillerCharacterChange={showcaseHook.setKillerCharacter}
          onKillerPrestigeChange={showcaseHook.setKillerPrestige}
          onKillerPerkChange={showcaseHook.setKillerPerk}
          locale={currentLocale}
        />

        <UserBugReportsDrawer
          reports={myReports}
          loading={loadingReports}
          onOpenReportModal={() => setBugModalOpen(true)}
          total={reportsTotal}
          unreadCount={unreadReports}
          page={reportsPage}
          perPage={REPORTS_PER_PAGE}
          totalPages={reportsTotalPages}
          onPageChange={handleReportsPageChange}
          onReportSeen={handleReportSeen}
        />
      </div>

      <BugReportModal
        isOpen={bugModalOpen}
        onSubmitted={() => setReportSubmitted(true)}
        onClose={() => {
          setBugModalOpen(false);
          // Only a new report changes the list; closing the dialog unused no longer resets it to page 1.
          if (reportSubmitted) {
            setReportSubmitted(false);
            void fetchMyReports(1);
          }
        }}
      />
    </>
  );
}
