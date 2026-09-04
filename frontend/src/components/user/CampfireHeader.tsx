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
    <div className="relative overflow-hidden rounded-3xl border border-border-color bg-bg-surface p-6 sm:p-8 backdrop-blur-xl shadow-md text-text-primary">
      {/* Campfire atmospheric ambient glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent-amber/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-accent-red/10 blur-3xl" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6">
        {/* Left Column: Avatar & Player Identity */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          {/* Barbed-wire framed avatar */}
          <div className="relative group cursor-pointer" onClick={onAvatarClick}>
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-accent-amber to-accent-red opacity-40 blur-xs group-hover:opacity-80 transition-opacity" />
            <div className="relative rounded-full p-1 border-2 border-accent-amber/40 bg-bg-surface shadow-md">
              <UserAvatar
                user={user}
                previewUrl={previewUrl}
                size="2xl"
                showAdminBadge={true}
                borderClassName="border-2 border-accent-amber/30"
              />
              {isUploadingAvatar && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-xs">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent-amber border-t-transparent" />
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent-amber text-text-inverted shadow-md">
              <Flame className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Name, Role & Details */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-text-primary font-mono">
                {user.username}
              </h1>
              <span
                className={`rounded-xl px-2.5 py-0.5 text-xs font-black uppercase tracking-wider border font-mono ${
                  user.role === 'admin'
                    ? 'border-accent-red/40 bg-accent-red/15 text-accent-red shadow-xs'
                    : 'border-cyan-500/40 bg-cyan-500/15 text-cyan-500 dark:text-cyan-400'
                }`}
              >
                {user.role}
              </span>
            </div>

            {/* Selectable Player Title Plaque */}
            <div className="flex items-center justify-center sm:justify-start">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-amber/35 bg-accent-amber/10 text-accent-amber text-xs sm:text-sm font-mono font-bold tracking-wide shadow-xs">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <div className="relative inline-block">
                  <select
                    value={showcase.playerTitle}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className="appearance-none bg-transparent text-accent-amber font-mono font-bold tracking-wider text-xs sm:text-sm pr-5 cursor-pointer focus:outline-none"
                    aria-label={dict?.user?.playerTitle || 'Player Title'}
                  >
                    {PLAYER_TITLES.map((title) => (
                      <option key={title} value={title} className="bg-bg-surface text-text-primary">
                        « {title} »
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-accent-amber">
                    <ChevronRight className="h-3 w-3 rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            {/* Email & Join Date */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-text-muted font-mono pt-0.5">
              {user.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-text-muted" />
                  {user.email}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-text-muted" />
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
            <div className="relative group flex items-center gap-2.5 rounded-2xl border border-accent-amber/35 bg-accent-amber/10 px-4 py-2.5 text-text-primary shadow-xs">
              <Flame className="h-5 w-5 text-accent-amber fill-accent-amber/25" />
              <div>
                <div className="text-[10px] font-black font-mono uppercase tracking-wider text-accent-amber">
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
                      className="w-12 bg-bg-surface border border-accent-amber text-accent-amber rounded px-1 text-xs font-mono font-bold"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleDevotionSubmit}
                      className="text-[10px] bg-accent-amber text-text-inverted px-1.5 py-0.5 rounded font-bold cursor-pointer hover:opacity-90 font-mono"
                    >
                      {dict?.user?.ok || 'OK'}
                    </button>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setTempDevotion(showcase.devotionLevel);
                      setIsEditingDevotion(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setTempDevotion(showcase.devotionLevel);
                        setIsEditingDevotion(true);
                      }
                    }}
                    title={dict?.user?.editDevotionTitle || 'Click to edit devotion level'}
                    className="cursor-pointer text-sm font-black font-mono text-text-primary hover:text-accent-amber flex items-center gap-1"
                  >
                    <span>{dict?.user?.lvlPrefix || 'Lvl'} {showcase.devotionLevel}</span>
                    <span className="text-[10px] text-accent-amber/80">✎</span>
                  </div>
                )}
              </div>
            </div>

            {/* Grade Rank Selector Badge */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-accent-red/35 bg-accent-red/10 px-4 py-2.5 text-text-primary shadow-xs">
              <Award className="h-5 w-5 text-accent-red" />
              <div>
                <div className="text-[10px] font-black font-mono uppercase tracking-wider text-accent-red">
                  {dict?.user?.gradeRank || 'Grade Rank'}
                </div>
                <select
                  value={showcase.gradeRank}
                  onChange={(e) => onGradeRankChange(e.target.value)}
                  className="bg-transparent text-sm font-black font-mono text-text-primary cursor-pointer focus:outline-none"
                  aria-label={dict?.user?.gradeRank || 'Grade Rank'}
                >
                  {GRADE_EMBLEMS.map((emblem) => (
                    <option key={emblem} value={emblem} className="bg-bg-surface text-text-primary">
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
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-accent-amber/40 bg-accent-amber/10 text-accent-amber">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>{dict?.user?.savingToDatabase || 'Saving to Fog...'}</span>
              </span>
            ) : saveError ? (
              <span
                title={saveError}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-accent-red/40 bg-accent-red/10 text-accent-red"
              >
                <AlertCircle className="h-3 w-3" />
                <span>{dict?.user?.offlineCached || 'Offline (Cached)'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                <span>{dict?.user?.savedToDatabase || 'Saved to Database'}</span>
              </span>
            )}
          </div>

          {/* Admin shortcut if user is admin */}
          {user.role === 'admin' && (
            <Link
              href={`/${currentLocale}/admin`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-red hover:opacity-80 transition-colors font-mono"
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
