// frontend/src/components/user/CampfireHeader.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  Crown,
  ChevronRight,
  ShieldCheck,
  Award,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Mail,
  Calendar,
} from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { PLAYER_TITLES, GRADE_EMBLEMS, type UserShowcaseState } from '@/types/userShowcase';
import type { Dictionary } from '@/locales/types';

interface CampfireHeaderProps {
  user: {
    id: number;
    username: string;
    email?: string;
    role: string;
    created_at?: string;
    avatar_url?: string;
  };
  showcase: UserShowcaseState;
  isSaving?: boolean;
  saveError?: string | null;
  onTitleChange: (title: string) => void;
  onDevotionChange: (devotion: number) => void;
  onGradeRankChange: (rank: string) => void;
  dict?: Dictionary | null;
  currentLocale: string;
  previewUrl?: string | null;
  isUploadingAvatar?: boolean;
  onAvatarClick?: () => void;
}

export const CampfireHeader: React.FC<CampfireHeaderProps> = ({
  user,
  showcase,
  isSaving = false,
  saveError = null,
  onTitleChange,
  onDevotionChange,
  onGradeRankChange,
  dict,
  currentLocale,
  previewUrl,
  isUploadingAvatar,
  onAvatarClick,
}) => {
  const [isEditingDevotion, setIsEditingDevotion] = useState(false);
  const [tempDevotion, setTempDevotion] = useState(showcase.devotionLevel);

  const handleDevotionSubmit = () => {
    setIsEditingDevotion(false);
    const clamped = Math.max(1, Math.min(99, tempDevotion || 1));
    onDevotionChange(clamped);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-900/30 dark:border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-slate-900/90 to-slate-950/95 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
      {/* Campfire atmospheric ambient glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-red-600/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6">
        {/* Left Column: Avatar & Player Identity */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          {/* Barbed-wire framed avatar */}
          <div className="relative group cursor-pointer" onClick={onAvatarClick}>
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-amber-600 via-red-600 to-amber-500 opacity-60 blur-xs group-hover:opacity-100 transition-opacity" />
            <div className="relative rounded-full p-1 border-2 border-amber-500/50 bg-slate-950 shadow-xl">
              <UserAvatar
                user={user}
                previewUrl={previewUrl}
                size="2xl"
                showAdminBadge={true}
                borderClassName="border-2 border-amber-400/40"
              />
              {isUploadingAvatar && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-xs">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-md">
              <Flame className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Name, Role & Details */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-slate-100 font-mono drop-shadow-sm">
                {user.username}
              </h1>
              <span
                className={`rounded-xl px-2.5 py-0.5 text-xs font-black uppercase tracking-wider border ${
                  user.role === 'admin'
                    ? 'border-red-500/50 bg-red-600/20 text-red-400 shadow-sm shadow-red-950/40'
                    : 'border-cyan-500/40 bg-cyan-600/20 text-cyan-400'
                }`}
              >
                {user.role}
              </span>
            </div>

            {/* Selectable Player Title */}
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <div className="relative inline-block">
                <select
                  value={showcase.playerTitle}
                  onChange={(e) => onTitleChange(e.target.value)}
                  className="appearance-none bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400/50 text-amber-300 font-serif tracking-wider text-xs sm:text-sm font-semibold py-1 pl-3 pr-7 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-amber-400"
                  aria-label={dict?.user?.playerTitle || 'Player Title'}
                >
                  {PLAYER_TITLES.map((title) => (
                    <option key={title} value={title} className="bg-slate-900 text-amber-200">
                      « {title} »
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-amber-400">
                  <ChevronRight className="h-3 w-3 rotate-90" />
                </div>
              </div>
            </div>

            {/* Email & Join Date */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-slate-400 pt-0.5">
              {user.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-slate-500" />
                  {user.email}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-slate-500" />
                {dict?.user?.memberSince || 'Member since'}{' '}
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : '2026'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Devotion Level, Grade Emblem & Cloud Sync Badge */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-center sm:items-end gap-3.5 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            {/* Devotion Level Badge */}
            <div className="relative group flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-950/30 px-3.5 py-2 text-slate-100 shadow-md backdrop-blur-md">
              <Flame className="h-5 w-5 text-amber-400 fill-amber-400/30 animate-pulse" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-400/80">
                  {dict?.user?.devotion || 'Devotion'}
                </div>
                {isEditingDevotion ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={tempDevotion}
                      onChange={(e) => setTempDevotion(parseInt(e.target.value, 10) || 1)}
                      onKeyDown={(e) => e.key === 'Enter' && handleDevotionSubmit()}
                      className="w-12 bg-slate-900 border border-amber-400 text-amber-300 rounded px-1 text-xs font-mono font-bold"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleDevotionSubmit}
                      className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-bold cursor-pointer hover:bg-amber-400"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setTempDevotion(showcase.devotionLevel);
                      setIsEditingDevotion(true);
                    }}
                    title="Click to edit devotion level"
                    className="cursor-pointer text-sm font-black font-mono text-amber-200 hover:text-amber-100 flex items-center gap-1"
                  >
                    <span>Lvl {showcase.devotionLevel}</span>
                    <span className="text-[10px] text-amber-400/60 group-hover:text-amber-300">✎</span>
                  </div>
                )}
              </div>
            </div>

            {/* Grade Rank Selector Badge */}
            <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-950/30 px-3.5 py-2 text-slate-100 shadow-md backdrop-blur-md">
              <Award className="h-5 w-5 text-red-400" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-red-400/80">
                  {dict?.user?.gradeRank || 'Grade Rank'}
                </div>
                <select
                  value={showcase.gradeRank}
                  onChange={(e) => onGradeRankChange(e.target.value)}
                  className="bg-transparent text-sm font-black font-mono text-red-200 cursor-pointer focus:outline-none"
                  aria-label={dict?.user?.gradeRank || 'Grade Rank'}
                >
                  {GRADE_EMBLEMS.map((emblem) => (
                    <option key={emblem} value={emblem} className="bg-slate-900 text-red-200">
                      {emblem}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Database Persistence Status Badge */}
          <div className="flex items-center gap-2 text-[11px] font-mono">
            {isSaving ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
                <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
                <span>{dict?.user?.savingToDatabase || 'Saving to Fog...'}</span>
              </span>
            ) : saveError ? (
              <span
                title={saveError}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-300"
              >
                <AlertCircle className="h-3 w-3 text-rose-400" />
                <span>Offline (Cached)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>{dict?.user?.savedToDatabase || 'Saved to Database'}</span>
              </span>
            )}
          </div>

          {/* Admin shortcut if user is admin */}
          {user.role === 'admin' && (
            <Link
              href={`/${currentLocale}/admin`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
            >
              <Crown className="h-3.5 w-3.5" />
              <span>{dict?.sidebar?.adminPanel || 'Admin Panel'}</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
