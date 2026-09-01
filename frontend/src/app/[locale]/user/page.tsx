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
import { UserMetricsGrid, UserMetricsGridSkeleton } from '@/components/user/UserMetricsGrid';
import { UserProfileForm } from '@/components/user/UserProfileForm';
import { UserBugReportsSkeleton } from '@/components/user/UserBugReportsSkeleton';
import { UserProfileSkeleton } from '@/components/user/UserProfileSkeleton';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';
import { UserBugReport, StatusFeedback } from '@/types/userProfile';
import { fetchMyBugReports, uploadAvatar, resetAvatar, ApiError } from '@/services/userProfileApi';
import {
  User,
  Mail,
  Calendar,
  Crown,
  ChevronRight,
  Dices,
  Compass,
  Repeat,
  Bug,
  Camera,
  Trash2,
  Upload,
} from 'lucide-react';

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
// "overview"), so its list UI is fetched only when the user actually
// switches to it.
const UserBugReportsList = dynamic(
  () => import('@/components/user/UserBugReportsList').then((m) => m.UserBugReportsList),
  { ssr: false, loading: () => <UserBugReportsSkeleton /> }
);


export default function UserProfilePage() {
  const params = useParams();
  const currentLocale = (params?.locale as Locale) || 'en';
  const { isCollapsed } = useSidebarState();
  const { user, isAuthenticated, isLoading, ownership, refreshUser } = useAuth();

  const [dict, setDict] = useState<Dictionary | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'bugs'>('overview');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);

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

  useEffect(() => {
    document.title = dict?.app?.userPageTitle || 'LemonDBD - User Profile';
    getDictionary(currentLocale).then(setDict);
  }, [currentLocale]);

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
    // Cancel a still-in-flight request from a prior page/tab switch so its
    // (potentially stale) response can never overwrite a newer one.
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
    // Full layout-matched skeleton (header/metrics/tabs/columns) instead of
    // a bare spinner -- keeps CLS at zero once the real content mounts.
    return <UserProfileSkeleton dict={dict} />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col items-center justify-center p-6 text-center dbd-fog-overlay">
        <div className="max-w-md w-full rounded-3xl border border-slate-800 bg-slate-950/90 p-8 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <LemonIcon className="h-10 w-10 text-amber-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-wider font-mono text-slate-100">
            {dict?.user?.authRequiredTitle || 'Authentication Required'}
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            {dict?.user?.authRequiredDesc || 'Please sign in or create an account to view your LemonDBD profile, manage your teachables, and track game challenges.'}
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <button

              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-amber-950/40 hover:from-amber-400 hover:to-red-500 transition-all cursor-pointer"
            >
              <User className="h-4 w-4" />
              <span>{dict?.user?.signIn || 'Sign In / Register'}</span>
            </button>
            <Link
              href={`/${currentLocale}`}
              className="text-xs text-slate-400 hover:text-amber-400 transition-colors py-1"
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
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={currentLocale}
        dict={dict}
        activeCategory="user"
      />

      <main
        className={`flex-1 w-full overflow-y-auto transition-all duration-300 p-4 sm:p-6 lg:p-8 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          {/* Header Card with Interactive Avatar Upload */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 p-5 sm:p-8 backdrop-blur-xl shadow-2xl">
            <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
            />

            <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
              {/* Interactive Avatar */}
              <div className="group relative flex flex-col items-center gap-2 shrink-0">
                <div className="relative">
                  <UserAvatar
                    user={user}
                    previewUrl={optimisticPreview}
                    size="2xl"
                    showAdminBadge={true}
                    borderClassName="border-2 border-amber-500/40 shadow-xl shadow-amber-950/40"
                  />
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-black/60 backdrop-blur-xs">
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    title={dict?.user?.changeAvatar || 'Upload Custom Avatar'}
                    className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer"
                  >
                    <Camera className="h-6 w-6 drop-shadow-md" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="relative flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer shadow-xs before:absolute before:-inset-3 before:content-['']"
                  >
                    <Upload className="h-3 w-3 text-amber-500" />
                    <span>{dict?.user?.changeAvatar || 'Change'}</span>
                  </button>
                  {(hasCustomAvatar || optimisticPreview) && (
                    <button
                      type="button"
                      onClick={handleResetAvatar}
                      disabled={isUploadingAvatar}
                      title={dict?.user?.removeAvatar || 'Reset to default icon'}
                      className="relative flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-950/40 px-2.5 py-1 text-[10px] font-bold text-rose-400 hover:bg-rose-900/60 transition-colors cursor-pointer shadow-xs before:absolute before:-inset-3 before:content-['']"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>{dict?.user?.removeAvatar || 'Reset'}</span>
                    </button>
                  )}
                </div>

                {avatarFeedback && (
                  <p
                    className={`text-[10px] font-semibold text-center mt-1 ${
                      avatarFeedback.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {avatarFeedback.text}
                  </p>
                )}
              </div>

              {/* User Profile Information */}
              <div className="flex-1 text-center sm:text-left space-y-2 w-full">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-wider text-slate-100 font-mono">
                    {user.username}
                  </h1>
                  <span
                    className={`rounded-xl px-2.5 py-0.5 text-xs font-black uppercase tracking-wider border ${
                      user.role === 'admin'
                        ? 'border-red-500/40 bg-red-600/20 text-red-400'
                        : 'border-cyan-500/40 bg-cyan-600/20 text-cyan-400'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    {user.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    {dict?.user?.memberSince || 'Member since'}{' '}
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '2026'}
                  </span>
                </div>

                {user.role === 'admin' && (

                  <div className="pt-2">
                    <Link
                      href={`/${currentLocale}/admin`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-600/10 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-600/20 transition-colors shadow-lg w-full sm:w-auto"
                    >
                      <Crown className="h-4 w-4" />
                      <span>{dict?.sidebar?.adminPanel || 'Admin Control Center'}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

              {/* Subtabs Switcher */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 border-b border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('overview')}
              className={`min-h-[48px] flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'overview'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="h-4 w-4" />
              <span>{dict?.user?.tabOverview || 'Overview & Settings'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('bugs')}
              className={`min-h-[48px] flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'bugs'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bug className="h-4 w-4" />
              <span>{dict?.user?.tabBugReports || 'My Bug Reports'} ({reportsTotal})</span>
            </button>
          </div>

          {activeSubTab === 'overview' ? (
            <>
              {ownership === null ? (
                <UserMetricsGridSkeleton />
              ) : (
                <UserMetricsGrid ownership={ownership} dict={dict} />
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 w-full">
                  <UserProfileForm
                    initialEmail={user.email || ''}
                    onRefreshUser={refreshUser}
                    dict={dict}
                  />
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-xl shadow-xl space-y-4 w-full">
                  <h2 className="text-base font-black uppercase tracking-wider text-slate-100 pb-2 border-b border-slate-800">
                    {dict?.user?.quickShortcuts || 'Quick Shortcuts'}
                  </h2>

                  <div className="space-y-2">

                    <Link
                      href={`/${currentLocale}/streaks`}
                      className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-xs font-bold text-slate-300 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-400 transition-all group shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <Repeat className="h-4 w-4 text-orange-400" />
                        <span>{dict?.sidebar?.streaks || 'Challenges'}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-transform" />
                    </Link>

                    <Link
                      href={`/${currentLocale}/randomizer`}
                      className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-xs font-bold text-slate-300 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-400 transition-all group shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <Dices className="h-4 w-4 text-amber-400" />
                        <span>{dict?.sidebar?.generator || 'Perk Randomizer'}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                    </Link>

                    <Link
                      href={`/${currentLocale}/maps`}
                      className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-xs font-bold text-slate-300 hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all group shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <Compass className="h-4 w-4 text-cyan-400" />
                        <span>{dict?.sidebar?.maps || 'Map Explorer'}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </>
          ) : (
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

