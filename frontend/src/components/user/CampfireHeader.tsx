// frontend/src/components/user/CampfireHeader.tsx
'use client';

import type { OwnershipSummary } from '@/context/AuthContext';
import React from 'react';
import Link from 'next/link';
import {
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
import { OverseerEyeIcon } from '@/components/icons/DbdIcons';

import { tip } from '@/components/common/Tooltip';
import { Spinner } from '@/components/common/Spinner';
import { formatDate } from '@/utils/format';
import { useDictionary } from "@/context/DictionaryContext";
import { Badge } from '@/components/common/Badge';
import { buttonClassName } from '@/components/common/Button';
import { Surface } from '@/components/common/Surface';
import { WrapRow } from '@/components/common/WrapRow';

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
  ownership?: OwnershipSummary | null;
  isSaving?: boolean;
  saveError?: string | null;
  onTitleChange: (title: string) => void;
  onDevotionChange?: (devotion: number) => void;
  onGradeRankChange?: (rank: string) => void;
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
      currentLocale,
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
              {...tip(dict.user.changeAvatar, undefined, 'action')}
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
                  <Camera className="h-5 w-5 sm:h-6 sm:w-6 mb-1 text-accent-red" />
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
            <WrapRow>
              <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-text-primary truncate">
                {user.username}
              </h1>
              {user.role === 'admin' && (
                <Badge tone="red" size="md" square>
                  {dict.user.roleAdmin}
                </Badge>
              )}
            </WrapRow>

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
                buttonClassName="border-accent-amber/35 bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20 hover:border-accent-amber text-xs font-bold tracking-wide"
                menuClassName="bg-bg-surface border-border-color shadow-xl"
                ariaLabel={dict.user.playerTitle}
              />
            </div>

            {/* Account Metadata: Member Since, Admin Panel Link */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 pt-0.5 text-xs text-text-secondary">
              {user.created_at && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-text-muted shrink-0" />
                  <span>
                    {dict.user.memberSince}{' '}
                    <strong className="text-text-primary font-normal">
                      {formatDate(user.created_at)}
                    </strong>
                  </span>
                </span>
              )}
              {user.role === 'admin' && (
                <Link
                  href={`/${currentLocale}/admin`}
                  className={buttonClassName('soft', 'xs')}
                >
                  <OverseerEyeIcon className="h-3 w-3" />
                  <span>{dict.sidebar.adminPanel}</span>
                  <ChevronRight className="h-2.5 w-2.5" />
                </Link>
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
