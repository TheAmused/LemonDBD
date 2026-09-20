'use client';
// frontend/src/components/UserAvatar.tsx

import React, { useState, useEffect } from 'react';
import { LemonIcon } from '@/components/LemonIcon';
import { OverseerEyeIcon } from '@/components/icons/DbdIcons';

interface UserAvatarProps {
  user?: {
    username?: string;
    avatar_url?: string | null;
    role?: string;
  } | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  showAdminBadge?: boolean;
  borderClassName?: string;
  shape?: 'circle' | 'rounded';
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
  '3xl': {
    container: 'h-28 w-28 xs:h-32 xs:w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 xl:h-44 xl:w-44 rounded-2xl sm:rounded-3xl',
    icon: 'h-16 w-16 xs:h-18 xs:w-18 sm:h-20 sm:w-20 md:h-22 md:w-22 xl:h-24 xl:w-24',
    badge: 'h-6 w-6 sm:h-7 sm:w-7 xl:h-8 xl:w-8 -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 xl:-top-2.5 xl:-right-2.5',
    badgeIcon: 'h-3.5 w-3.5 sm:h-4 sm:w-4 xl:h-4.5 xl:w-4.5',
  },
} as const;

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  showAdminBadge = false,
  borderClassName,
  shape = 'rounded',
  previewUrl,
  adminTitle,
  adminAriaLabel,
  alt,
}) => {
  const [imgError, setImgError] = useState(false);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
  const containerClasses = shape === 'circle'
    ? sizeConfig.container.replace(/rounded-\S+/, 'rounded-full')
    : sizeConfig.container;

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
    'border border-border-color bg-bg-primary text-text-primary shadow-xs';

  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center ${className}`}>
      <div
        className={`relative flex items-center justify-center overflow-hidden ${containerClasses} ${defaultBorder}`}
      >
        {isCustomAvatar ? (
          <img
            src={finalSrc}
            alt={alt || user?.username}
            onError={() => {
              console.warn('Avatar image failed to load from:', finalSrc);
              setImgError(true);
            }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-accent-amber p-1">
            <LemonIcon className={sizeConfig.icon} />
          </div>
        )}
      </div>

      {showAdminBadge && user?.role === 'admin' && (
        <span
          className={`absolute flex items-center justify-center rounded-full bg-accent-red text-text-inverted shadow-xs border border-accent-red/40 ${sizeConfig.badge}`}
          title={adminTitle}
          aria-label={adminAriaLabel}
        >
          <OverseerEyeIcon className={sizeConfig.badgeIcon} />
        </span>
      )}
    </div>
  );
};

