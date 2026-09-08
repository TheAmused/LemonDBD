// frontend/src/components/user/CampfireHeader.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import {
  Crown,
  ChevronRight,
  Sparkles,
  Camera,
  Calendar,
} from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { VaultMasteryDials } from '@/components/user/VaultMasteryDials';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import { PLAYER_TITLES, type UserShowcaseState } from '@/types/userShowcase';
import type { StatusFeedback } from '@/types/userProfile';
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
  ownership?: any;
  isSaving?: boolean;
  saveError?: string | null;
  onTitleChange: (title: string) => void;
  onDevotionChange?: (devotion: number) => void;
  onGradeRankChange?: (rank: string) => void;
  dict?: Dictionary | null;
  currentLocale: string;
  previewUrl?: string | null;
  isUploadingAvatar?: boolean;
  onAvatarClick?: () => void;
  avatarFeedback?: StatusFeedback | null;
}

export const CampfireHeader: React.FC<CampfireHeaderProps> = ({
  user,
  showcase,
  ownership,
  onTitleChange,
  dict,
  currentLocale,
  previewUrl,
  isUploadingAvatar,
  onAvatarClick,
  avatarFeedback,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border-color bg-bg-surface p-6 sm:p-7 2xl:p-9 backdrop-blur-xl shadow-md text-text-primary">
      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 items-center">
        {/* Left Column: Avatar & Player Identity (5 cols on xl+) */}
        <div className="xl:col-span-5 2xl:col-span-5 flex flex-col sm:flex-row items-center gap-5 sm:gap-7 text-center sm:text-left min-w-0 w-full justify-center xl:justify-start">
          {/* Avatar Column with feedback */}
          <div className="flex flex-col items-center shrink-0 gap-1.5">
            {/* Square-ish avatar with single clean border and click-to-change hover */}
            <div
              className="relative group cursor-pointer shrink-0"
              onClick={onAvatarClick}
              title={dict?.user?.changeAvatar || 'Change Avatar'}
              aria-label={dict?.user?.changeAvatar || 'Change Avatar'}
            >
              <div className="absolute -inset-1 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-accent-amber to-accent-red opacity-30 blur-xs group-hover:opacity-75 transition-opacity" />
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden p-0.5 border-2 border-accent-amber/60 bg-bg-surface shadow-md">
                <UserAvatar
                  user={user}
                  previewUrl={previewUrl}
                  size="3xl"
                  shape="rounded"
                  showAdminBadge={true}
                  borderClassName="border-0"
                />
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs rounded-2xl sm:rounded-3xl">
                  <Camera className="h-5 w-5 sm:h-6 sm:w-6 mb-1 text-accent-amber" />
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider">
                    {dict?.user?.changeAvatar || 'Change'}
                  </span>
                </div>
                {isUploadingAvatar && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl sm:rounded-3xl bg-black/60 backdrop-blur-xs">
                    <span className="h-7 w-7 animate-spin rounded-full border-2 border-accent-amber border-t-transparent" />
                  </div>
                )}
              </div>
            </div>

            {avatarFeedback && (
              <p
                className={`text-[11px] font-mono font-semibold text-center max-w-[140px] leading-tight ${
                  avatarFeedback.type === 'success' ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {avatarFeedback.text}
              </p>
            )}
          </div>

          {/* Name, Role, Title & Account Metadata */}
          <div className="space-y-2.5 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-text-primary font-mono truncate">
                {user.username}
              </h1>
              {user.role === 'admin' && (
                <span className="rounded-xl px-2.5 py-0.5 text-xs font-black uppercase tracking-wider border font-mono border-accent-red/40 bg-accent-red/15 text-accent-red shadow-xs">
                  {dict?.user?.roleAdmin || 'Administrator'}
                </span>
              )}
            </div>

            {/* Selectable Player Title Plaque via CustomDropdown */}
            <div className="flex items-center justify-center sm:justify-start">
              <CustomDropdown
                value={showcase.playerTitle}
                onChange={onTitleChange}
                options={PLAYER_TITLES.map((title) => ({
                  value: title,
                  label: `« ${title} »`,
                }))}
                icon={<Sparkles className="h-3.5 w-3.5 text-accent-amber" />}
                buttonClassName="border-accent-amber/35 bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20 hover:border-accent-amber text-xs font-mono font-bold tracking-wide"
                menuClassName="bg-bg-surface border-border-color shadow-xl"
                ariaLabel={dict?.user?.playerTitle || 'Player Title'}
              />
            </div>

            {/* Account Metadata: Member Since, Admin Panel Link */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 pt-0.5 text-xs text-text-secondary font-mono">
              {user.created_at && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-text-muted shrink-0" />
                  <span>
                    {dict?.user?.memberSince || 'Member since'}{' '}
                    <strong className="text-text-primary font-normal">
                      {new Date(user.created_at).toLocaleDateString()}
                    </strong>
                  </span>
                </span>
              )}
              {user.role === 'admin' && (
                <Link
                  href={`/${currentLocale}/admin`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border border-accent-red/30 bg-accent-red/10 text-[11px] font-bold text-accent-red hover:bg-accent-red/20 transition-colors font-mono"
                >
                  <Crown className="h-3 w-3" />
                  <span>{dict?.sidebar?.adminPanel || 'Admin Panel'}</span>
                  <ChevronRight className="h-2.5 w-2.5" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Vault Mastery Radial Dials (7 cols on xl+) */}
        <div className="xl:col-span-7 2xl:col-span-7 flex flex-col items-center justify-center w-full pt-6 xl:pt-0 border-t xl:border-t-0 border-border-color">
          <VaultMasteryDials
            ownership={ownership}
            dict={dict}
            compact={false}
            hideTitle={false}
          />
        </div>
      </div>
    </div>
  );
};
