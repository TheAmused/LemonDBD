'use client';

import type { Dictionary } from '@/locales/types';
// frontend/src/app/[locale]/user/page.tsx

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LemonIcon } from '@/components/LemonIcon';
import { UserAvatar } from '@/components/UserAvatar';
import { Sidebar } from '@/components/Sidebar';
import { CampfireHeader } from '@/components/user/CampfireHeader';
import { VaultMasteryDials } from '@/components/user/VaultMasteryDials';
import { DualMainsShowcase } from '@/components/user/DualMainsShowcase';
import { StreakTrophyCard } from '@/components/user/StreakTrophyCard';
import { UserProfileForm } from '@/components/user/UserProfileForm';
import { UserBugReportsSkeleton } from '@/components/user/UserBugReportsSkeleton';
import { UserProfileSkeleton } from '@/components/user/UserProfileSkeleton';
import { Locale } from '@/i18n/config';
import { UserBugReport, StatusFeedback } from '@/types/userProfile';
import { fetchMyBugReports, uploadAvatar, resetAvatar, ApiError } from '@/services/userProfileApi';
import { useUserShowcase } from '@/hooks/useUserShowcase';
import {
  User,
  Flame,
  Settings,
  ChevronRight,
  Dices,
  Compass,
  Repeat,
  Bug,
  Camera,
  Trash2,
  Upload,
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

// The bug-reports subtab is not visible on first paint (default tab is
// "dossier"), so its list UI is fetched only when the user actually
// switches to it.
const UserBugReportsList = dynamic(
  () => import('@/components/user/UserBugReportsList').then((m) => m.UserBugReportsList),
  { ssr: false, loading: () => <UserBugReportsSkeleton /> }
);

export default function UserProfilePage() {
  const params = useParams();
  const currentLocale = (params?.locale as Locale) || 'en';
  const { user, isAuthenticated, isLoading, ownership, refreshUser } = useAuth();

  const dict = useDictionary();
  const [activeTab, setActiveTab] = useState<'dossier' | 'sanctum' | 'bugs'>('dossier');
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
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-amber to-accent-red py-3 text-xs font-black uppercase tracking-wider text-text-inverted shadow-lg shadow-accent-amber/20 hover:opacity-95 transition-all cursor-pointer font-mono"
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
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={currentLocale}
        dict={dict}
        activeCategory="user"
      />

      <main className="flex-1 w-full overflow-y-auto transition-[padding] duration-300 p-4 sm:p-6 lg:p-8 lemon-shell-main">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          {/* Hidden avatar file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarFileChange}
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
          />

          {/* Tab Navigation: Dossier (Default), Account Sanctum, Bug Reports */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 border-b border-border-color pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('dossier')}
              className={`min-h-[44px] flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap font-mono ${
                activeTab === 'dossier'
                  ? 'bg-accent-amber/15 text-accent-amber border border-accent-amber/35 shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/60 border border-transparent'
              }`}
            >
              <Flame className="h-4 w-4 text-accent-amber" />
              <span>{dict?.user?.tabDossier || 'Campfire Dossier'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sanctum')}
              className={`min-h-[44px] flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap font-mono ${
                activeTab === 'sanctum'
                  ? 'bg-bg-surface text-text-primary border border-border-color shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/60 border border-transparent'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>{dict?.user?.tabSanctum || 'Account Sanctum'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bugs')}
              className={`min-h-[44px] flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap font-mono ${
                activeTab === 'bugs'
                  ? 'bg-accent-red/15 text-accent-red border border-accent-red/35 shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/60 border border-transparent'
              }`}
            >
              <Bug className="h-4 w-4" />
              <span>{dict?.user?.tabBugReports || 'My Bug Reports'} ({reportsTotal})</span>
            </button>
          </div>

          {/* TAB 1: Campfire Dossier */}
          {activeTab === 'dossier' && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
              {/* Campfire Header Card */}
              <CampfireHeader
                user={user}
                showcase={showcaseHook.showcase}
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
              />

              {/* Vault Mastery Radial Dials */}
              <VaultMasteryDials ownership={ownership} dict={dict} />

              {/* Dual Mains Signature Showcase (Survivor & Killer with 4-Perk Diamond Loadouts) */}
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

              {/* Streak & Challenge Trophy Highlights */}
              <StreakTrophyCard currentLocale={currentLocale} dict={dict} />
            </div>
          )}

          {/* TAB 2: Account Sanctum (Security, Email, Password, Avatar & Clean Shortcuts) */}
          {activeTab === 'sanctum' && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
              {/* Avatar Management Card */}
              <div className="rounded-3xl border border-border-color bg-bg-surface p-6 backdrop-blur-xl shadow-md space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-text-primary pb-2 border-b border-border-color font-mono">
                  {dict?.user?.changeAvatar || 'Avatar & Profile Picture'}
                </h3>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <UserAvatar
                      user={user}
                      previewUrl={optimisticPreview}
                      size="xl"
                      showAdminBadge={true}
                      borderClassName="border-2 border-accent-amber/40"
                    />
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
                      <Camera className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="space-y-2 flex-1 text-center sm:text-left">
                    <p className="text-xs text-text-secondary">
                      {dict?.user?.avatarHelpText || 'Upload a custom avatar (PNG, JPEG, WebP, max 10MB) or reset to the default icon.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-color bg-bg-elevated text-xs font-bold text-text-primary hover:border-accent-amber/50 transition-colors cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5 text-accent-amber" />
                        <span>{dict?.user?.changeAvatar || 'Upload New Avatar'}</span>
                      </button>

                      {(hasCustomAvatar || optimisticPreview) && (
                        <button
                          type="button"
                          onClick={handleResetAvatar}
                          disabled={isUploadingAvatar}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-bold text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>{dict?.user?.removeAvatar || 'Reset to Default'}</span>
                        </button>
                      )}
                    </div>
                    {avatarFeedback && (
                      <p
                        className={`text-xs font-semibold pt-1 ${
                          avatarFeedback.type === 'success'
                            ? 'text-emerald-500'
                            : 'text-rose-500'
                        }`}
                      >
                        {avatarFeedback.text}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Form & Shortcuts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 w-full">
                  <UserProfileForm
                    initialEmail={user.email || ''}
                    onRefreshUser={refreshUser}
                    dict={dict}
                  />
                </div>

                {/* Clean Quick Shortcuts (Zero 'Others' items, zero quests) */}
                <div className="rounded-3xl border border-border-color bg-bg-surface p-6 backdrop-blur-xl shadow-md space-y-4 w-full h-fit">
                  <h2 className="text-base font-black uppercase tracking-wider text-text-primary pb-2 border-b border-border-color font-mono">
                    {dict?.user?.quickShortcuts || 'Quick Shortcuts'}
                  </h2>

                  <div className="space-y-2">
                    <Link
                      href={`/${currentLocale}/streaks`}
                      className="flex items-center justify-between rounded-xl border border-border-color bg-bg-elevated/40 p-3 text-xs font-bold text-text-primary hover:border-accent-amber/40 hover:bg-accent-amber/10 hover:text-accent-amber transition-all group shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Repeat className="h-4 w-4 text-accent-amber" />
                        <span>{dict?.sidebar?.streaks || 'Challenges'}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-accent-amber group-hover:translate-x-0.5 transition-transform" />
                    </Link>

                    <Link
                      href={`/${currentLocale}/randomizer`}
                      className="flex items-center justify-between rounded-xl border border-border-color bg-bg-elevated/40 p-3 text-xs font-bold text-text-primary hover:border-accent-amber/40 hover:bg-accent-amber/10 hover:text-accent-amber transition-all group shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Dices className="h-4 w-4 text-accent-amber" />
                        <span>{dict?.sidebar?.generator || 'Perk Randomizer'}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-accent-amber group-hover:translate-x-0.5 transition-transform" />
                    </Link>

                    <Link
                      href={`/${currentLocale}/maps`}
                      className="flex items-center justify-between rounded-xl border border-border-color bg-bg-elevated/40 p-3 text-xs font-bold text-text-primary hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-500 transition-all group shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Compass className="h-4 w-4 text-cyan-500" />
                        <span>{dict?.sidebar?.maps || 'Map Explorer'}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Bug Reports */}
          {activeTab === 'bugs' && (
            <Suspense fallback={<UserBugReportsSkeleton dict={dict} />}>
              <UserBugReportsList
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
            </Suspense>
          )}
        </div>
      </main>

      <BugReportModal
        isOpen={bugModalOpen}
        onClose={() => {
          setBugModalOpen(false);
          fetchMyReports();
        }}
        dict={dict}
      />
    </div>
  );
}
