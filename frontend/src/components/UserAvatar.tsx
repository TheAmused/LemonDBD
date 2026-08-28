'use client';
// frontend/src/components/UserAvatar.tsx

import React, { useState, useEffect } from 'react';
import { LemonIcon } from '@/components/LemonIcon';
import { Crown } from 'lucide-react';

interface UserAvatarProps {
  user?: {
    username?: string;
    avatar_url?: string | null;
    role?: string;
  } | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showAdminBadge?: boolean;
  borderClassName?: string;
  previewUrl?: string | null;
  adminTitle?: string;
  adminAriaLabel?: string;
  alt?: string;
}

const SIZE_MAP = {
  xs: {
    container: 'h-6 w-6 rounded-md',
    icon: 'h-3.5 w-3.5',
    badge: 'h-3 w-3 -top-1 -right-1',
    badgeIcon: 'h-2 w-2',
  },
  sm: {
    container: 'h-8 w-8 rounded-xl',
    icon: 'h-4 w-4',
    badge: 'h-4 w-4 -top-1 -right-1',
    badgeIcon: 'h-2.5 w-2.5',
  },
  md: {
    container: 'h-10 w-10 rounded-xl',
    icon: 'h-5 w-5',
    badge: 'h-4 w-4 -top-1 -right-1',
    badgeIcon: 'h-2.5 w-2.5',
  },
  lg: {
    container: 'h-16 w-16 rounded-2xl',
    icon: 'h-8 w-8',
    badge: 'h-5 w-5 -top-1.5 -right-1.5',
    badgeIcon: 'h-3 w-3',
  },
  xl: {
    container: 'h-20 w-20 rounded-3xl',
    icon: 'h-11 w-11',
    badge: 'h-6 w-6 -top-2 -right-2',
    badgeIcon: 'h-3.5 w-3.5',
  },
  '2xl': {
    container: 'h-24 w-24 rounded-3xl',
    icon: 'h-14 w-14',
    badge: 'h-7 w-7 -top-2 -right-2',
    badgeIcon: 'h-4 w-4',
  },
} as const;

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  showAdminBadge = false,
  borderClassName,
  previewUrl,
  adminTitle,
  adminAriaLabel,
  alt,
}) => {
  const [imgError, setImgError] = useState(false);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;

  const rawAvatarUrl = previewUrl || user?.avatar_url;

  useEffect(() => {
    setImgError(false);
  }, [rawAvatarUrl]);

  const isCustomAvatar =
    Boolean(rawAvatarUrl) &&
    rawAvatarUrl !== 'default_avatar' &&
    rawAvatarUrl !== '' &&
    !imgError;

  let finalSrc = '';
  if (isCustomAvatar && rawAvatarUrl) {
    if (
      rawAvatarUrl.startsWith('http://') ||
      rawAvatarUrl.startsWith('https://') ||
      rawAvatarUrl.startsWith('blob:') ||
      rawAvatarUrl.startsWith('data:')
    ) {
      finalSrc = rawAvatarUrl;
    } else if (rawAvatarUrl.startsWith('/')) {
      finalSrc = rawAvatarUrl;
    } else {
      finalSrc = `/${rawAvatarUrl}`;
    }
  }

  const defaultBorder =
    borderClassName ||
    'border border-amber-500/30 dark:border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-slate-100 dark:to-slate-900 shadow-sm';

  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center ${className}`}>
      <div
        className={`relative flex items-center justify-center overflow-hidden ${sizeConfig.container} ${defaultBorder}`}
      >
        {isCustomAvatar ? (
          <img
            src={finalSrc}
            alt={alt || user?.username || ''}
            onError={() => {
              console.warn('Avatar image failed to load from:', finalSrc);
              setImgError(true);
            }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-amber-500 dark:text-amber-400 p-1">
            <LemonIcon className={sizeConfig.icon} />
          </div>
        )}
      </div>

      {showAdminBadge && user?.role === 'admin' && (
        <span
          className={`absolute flex items-center justify-center rounded-full bg-red-600 text-white shadow-md border border-red-400 ${sizeConfig.badge}`}
          title={adminTitle}
          aria-label={adminAriaLabel}
        >
          <Crown className={sizeConfig.badgeIcon} />
        </span>
      )}
    </div>
  );
};