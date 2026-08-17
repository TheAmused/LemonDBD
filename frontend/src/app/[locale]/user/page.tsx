'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LemonIcon } from '@/components/LemonIcon';
import { Sidebar } from '@/components/Sidebar';
import { AuthModal } from '@/components/AuthModal';
import {
  User,
  Shield,
  Skull,
  Sparkles,
  Key,
  Mail,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Crown,
  ChevronRight,
  TrendingUp,
  Dices,
  Compass,
  Repeat
} from 'lucide-react';

export default function UserProfilePage() {
  const params = useParams();
  const currentLocale = (params?.locale as string) || 'en';
  const { user, isAuthenticated, isLoading, ownership, refreshUser } = useAuth();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    document.title = 'LemonDBD - User Profile';
    if (user?.email) {
      setNewEmail(user.email);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setStatusMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    const token = localStorage.getItem('lemondbd_token');
    if (!token) return;

    setIsUpdating(true);
    try {
      const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const body: any = {};
      if (newEmail && newEmail !== user.email) body.email = newEmail;
      if (newPassword) body.new_password = newPassword;

      const res = await fetch(`${backendBase}/api/v1/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to update profile.' });
      } else {
        setStatusMessage({ type: 'success', text: 'Profile updated successfully!' });
        setNewPassword('');
        setConfirmPassword('');
        await refreshUser();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Network error occurred.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const dummyDict = {
    app: { title: 'LemonDBD', syncWiki: 'Sync Wiki Data', syncing: 'Syncing...' },
    filters: { allCategories: 'Perks Vault', generatorTab: 'Perk Randomizer' },
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <LemonIcon className="h-10 w-10 animate-bounce" />
          <p className="text-sm font-mono text-amber-600 dark:text-amber-400">Loading user profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 text-center transition-colors duration-300">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white/90 dark:bg-slate-950/80 p-8 backdrop-blur-xl shadow-xl dark:shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <LemonIcon className="h-10 w-10 text-amber-500 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-slate-900 dark:text-slate-100 font-mono mb-2">
            User Authentication Required
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">
            Please log in or create an account to view your LemonDBD profile, track owned survivors and killers, and manage teachables.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-amber-900/30 hover:from-amber-400 hover:to-red-500 transition-all cursor-pointer"
            >
              <User className="h-4 w-4" />
              <span>Sign In / Register</span>
            </button>
            <Link
              href={`/${currentLocale}`}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors py-1"
            >
              Return to Home
            </Link>
          </div>
        </div>
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    );
  }

  const survPercent = ownership?.survivors.percentage || 0;
  const killerPercent = ownership?.killers.percentage || 0;
  const perkPercent = ownership?.perks.percentage || 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar
        currentLocale={currentLocale}
        dict={dummyDict}
        activeCategory="user"
        onSelectCategory={() => {}}
      />

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64 min-w-0">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
          {/* Header Card */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-amber-50/70 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 p-6 sm:p-8 shadow-sm dark:shadow-2xl">
            <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-100 to-slate-100 dark:from-amber-500/20 dark:via-red-950/40 dark:to-slate-900 border-2 border-amber-500/40 shadow-md dark:shadow-xl shadow-amber-950/30">
                <LemonIcon className="h-14 w-14" />
                {user.role === 'admin' && (
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow-lg border border-red-400">
                    <Crown className="h-4 w-4" />
                  </span>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-slate-900 dark:text-slate-100 font-mono">
                    {user.username}
                  </h1>
                  <span
                    className={`rounded-xl px-2.5 py-1 text-xs font-black uppercase tracking-wider border ${
                      user.role === 'admin'
                        ? 'border-red-500/40 bg-red-600/10 dark:bg-red-600/20 text-red-700 dark:text-red-400'
                        : 'border-cyan-500/40 bg-cyan-600/10 dark:bg-cyan-600/20 text-cyan-700 dark:text-cyan-400'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    {user.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : '2026'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                  Active Player & LemonDBD Community Member
                </p>
              </div>

              {user.role === 'admin' && (
                <Link
                  href={`/${currentLocale}/admin`}
                  className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-600/10 px-4 py-2.5 text-xs font-bold text-red-700 dark:text-red-400 hover:bg-red-600/20 transition-colors shadow-sm dark:shadow-lg"
                >
                  <Crown className="h-4 w-4" />
                  <span>Admin Control Center</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>

          {/* Collection & Progress Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Survivors Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-5 backdrop-blur-xl shadow-sm dark:shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Survivors
                    </h3>
                    <p className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                      {ownership?.survivors.owned || 0} / {ownership?.survivors.total || 54}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-cyan-600 dark:text-cyan-400 font-mono">
                  {survPercent}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                  style={{ width: `${survPercent}%` }}
                />
              </div>
            </div>

            {/* Killers Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-5 backdrop-blur-xl shadow-sm dark:shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                    <Skull className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Killers
                    </h3>
                    <p className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                      {ownership?.killers.owned || 0} / {ownership?.killers.total || 44}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-red-600 dark:text-red-400 font-mono">
                  {killerPercent}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-500"
                  style={{ width: `${killerPercent}%` }}
                />
              </div>
            </div>

            {/* Unlocked Perks Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-5 backdrop-blur-xl shadow-sm dark:shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Teachable Perks
                    </h3>
                    <p className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                      {ownership?.perks.unlocked || 0} / {ownership?.perks.total || 321}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
                  {perkPercent}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                  style={{ width: `${perkPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Account Settings & Quick Navigation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Account Settings Form */}
            <div className="lg:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/70 p-6 sm:p-8 backdrop-blur-xl shadow-sm dark:shadow-xl">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                <Key className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                <h2 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-slate-200">
                  Account Credentials & Settings
                </h2>
              </div>

              {statusMessage && (
                <div
                  className={`mb-5 flex items-center gap-2.5 rounded-xl border p-3 text-xs shadow-sm ${
                    statusMessage.type === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      New Password (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep current"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-amber-950/30 hover:from-amber-400 hover:to-red-500 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isUpdating ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Links / Navigation Shortcuts */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/70 p-6 backdrop-blur-xl shadow-sm dark:shadow-xl space-y-4">
              <h2 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 pb-2 border-b border-slate-200 dark:border-slate-800">
                Quick Shortcuts
              </h2>

              <div className="space-y-2">
                <Link
                  href={`/${currentLocale}/streaks`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/60 p-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-700 dark:hover:text-orange-400 transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <Repeat className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                    <span>Streaks & Gauntlet</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-600 group-hover:text-orange-500 dark:group-hover:text-orange-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  href={`/${currentLocale}?tab=generator`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/60 p-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400 transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <Dices className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                    <span>Perk Randomizer</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-600 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  href={`/${currentLocale}/maps`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/60 p-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-400 transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <Compass className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
                    <span>Map Explorer</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-600 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
