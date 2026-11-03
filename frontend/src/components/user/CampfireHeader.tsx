// frontend/src/components/user/CampfireHeader.tsx
'use client';

import type { OwnershipSummary } from '@/context/AuthContext';
import React from 'react';
import { Camera, Calendar } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { VaultMasteryDials } from '@/components/user/VaultMasteryDials';
import type { StatusFeedback } from '@/types/userProfile';

import { Spinner } from '@/components/common/Spinner';
import { formatDate } from '@/utils/format';
import { useDictionary } from "@/context/DictionaryContext";
import { Surface } from '@/components/common/Surface';

interface CampfireHeaderProps {
  user: {
    id: number;
    username: string;
    email?: string;
    role: string;
    created_at?: string;
    avatar_url?: string;
  };
  ownership?: OwnershipSummary | null;
  isSaving?: boolean;
  saveError?: string | null;
  onDevotionChange?: (devotion: number) => void;
  onGradeRankChange?: (rank: string) => void;
  previewUrl?: string | null;
  isUploadingAvatar?: boolean;
  onAvatarClick?: () => void;
  avatarFeedback?: StatusFeedback | null;
}

export const CampfireHeader: React.FC<CampfireHeaderProps> = ({
      user,
      ownership,
      previewUrl,
      isUploadingAvatar,
      onAvatarClick,
      avatarFeedback,
    }) => {
  const dict = useDictionary();
  return (
    <Surface padding="none" className="relative overflow-hidden p-6 sm:p-7 2xl:p-9 backdrop-blur-xl shadow-md text-text-primary">
      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 items-center">
        {/* Left Column: Avatar & Player Identity (5 cols on xl+) */}
        <div className="xl:col-span-5 2xl:col-span-5 flex flex-col sm:flex-row items-center gap-5 sm:gap-7 text-center sm:text-left min-w-0 w-full justify-center xl:justify-start">
          {/* Avatar Column with feedback */}
          <div className="flex flex-col items-center shrink-0 gap-1.5">
            {/* Square-ish avatar with single clean border and click-to-change hover */}
            <button
              type="button"
              className="relative group cursor-pointer shrink-0 rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
              onClick={onAvatarClick}
              aria-label={dict.user.changeAvatar}
            >
              <span className="relative block rounded-card p-0.5 border-2 border-accent-red/60 bg-bg-surface shadow-md">
                <UserAvatar
                  user={user}
                  previewUrl={previewUrl}
                  size="3xl"
                  shape="rounded"
                  showAdminBadge={true}
                  borderClassName="border-0"
                />
                <span className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-primary/80 text-text-inverted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity rounded-card">
                  <Camera className="icon-lg sm:icon-xl mb-1 text-accent-red" />
                  <span className="text-micro sm:text-tiny font-bold uppercase tracking-wider">
                    {dict.user.changeAvatar}
                  </span>
                </span>
                {isUploadingAvatar && (
                  <span className="absolute inset-0 z-20 flex items-center justify-center rounded-card bg-bg-primary/70 backdrop-blur-xs">
                    <Spinner size="lg" tone="accent" className="h-7 w-7" />
                  </span>
                )}
              </span>
            </button>

            {avatarFeedback && (
              <p
                className={`text-mini font-semibold text-center max-w-35 leading-tight ${
                  avatarFeedback.type === 'success' ? 'text-accent-green' : 'text-accent-red'
                }`}
              >
                {avatarFeedback.text}
              </p>
            )}
          </div>

          {/* Name, Role, Title & Account Metadata */}
          <div className="space-y-2.5 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-text-primary truncate">
              {user.username}
            </h1>

            {/* Account Metadata: Member Since */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 pt-0.5 text-xs text-text-secondary">
              {user.created_at && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="icon-sm text-text-muted shrink-0" />
                  <span>
                    {dict.user.memberSince}{' '}
                    <strong className="text-text-primary font-normal">
                      {formatDate(user.created_at)}
                    </strong>
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Vault Mastery Radial Dials (7 cols on xl+) */}
        <div className="xl:col-span-7 flex flex-col items-center justify-center w-full pt-6 xl:pt-0 border-t xl:border-t-0 border-border-color">
          <VaultMasteryDials
            ownership={ownership}
            compact={false}
            hideTitle={false}
          />
        </div>
      </div>
    </Surface>
  );
};
