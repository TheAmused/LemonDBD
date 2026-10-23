'use client';
// frontend/src/components/UserAvatar.tsx

import { logger } from '@/utils/logger';
import React, { useState } from 'react';
import { LemonIcon } from '@/components/LemonIcon';
import { OverseerEyeIcon } from '@/components/icons/DbdIcons';

import { tip } from '@/components/common/Tooltip';
import { Img } from '@/components/common/Img';
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

/**
 * The `src` for an avatar value, or '' for the default picture.
 *
 * Only same-origin paths load (uploads are served from `/api/v1/auth/avatar/file/`), plus the
 * local `blob:` preview of a file the user is uploading right now. A remote URL never does: avatars
 * are shown in the admin user list, so any `https://` value would be a tracking pixel in every
 * admin's browser.
 */
export function avatarImageSrc(value: string, isLocalPreview = false): string {
  const v = value.trim();
  if (!v || v === 'default_avatar') return '';
  if (isLocalPreview && v.startsWith('blob:')) return v;
  // No scheme (`https:`, `data:`, `javascript:`...) and no protocol-relative `//host`.
  if (v.includes(':') || v.startsWith('//') || v.includes('\\')) return '';
  return v.startsWith('/') ? v : `/${v}`;
}

const SIZE_MAP = {
  xs: {
    container: 'h-6 w-6 rounded-chip',
    icon: 'h-3.5 w-3.5',
    badge: 'h-3 w-3 -top-1 -right-1',
    badgeIcon: 'h-2 w-2',
  },
  sm: {
    container: 'h-8 w-8 rounded-control',
    icon: 'h-4 w-4',
    badge: 'h-4 w-4 -top-1 -right-1',
    badgeIcon: 'h-2.5 w-2.5',
  },
  md: {
    container: 'h-10 w-10 rounded-control',
    icon: 'h-5 w-5',
    badge: 'h-4 w-4 -top-1 -right-1',
    badgeIcon: 'h-2.5 w-2.5',
  },
  lg: {
    container: 'h-16 w-16 rounded-card',
    icon: 'h-8 w-8',
    badge: 'h-5 w-5 -top-1.5 -right-1.5',
    badgeIcon: 'h-3 w-3',
  },
  xl: {
    container: 'h-20 w-20 rounded-card',
    icon: 'h-11 w-11',
    badge: 'h-6 w-6 -top-2 -right-2',
    badgeIcon: 'h-3.5 w-3.5',
  },
  '2xl': {
    container: 'h-24 w-24 rounded-card',
    icon: 'h-14 w-14',
    badge: 'h-7 w-7 -top-2 -right-2',
    badgeIcon: 'h-4 w-4',
  },
  '3xl': {
    container: 'h-28 w-28 xs:h-32 xs:w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 xl:h-44 xl:w-44 rounded-card',
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
  // The source that failed to load; a new avatar URL gets its own try.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
  const containerClasses = shape === 'circle'
    ? sizeConfig.container.replace(/rounded-\S+/, 'rounded-full')
    : sizeConfig.container;

  const rawAvatarUrl = previewUrl || user?.avatar_url;

  const finalSrc = rawAvatarUrl ? avatarImageSrc(rawAvatarUrl, Boolean(previewUrl)) : '';
  const isCustomAvatar = finalSrc !== '' && failedSrc !== finalSrc;

  const defaultBorder =
    borderClassName ||
    'border border-border-color bg-bg-primary text-text-primary shadow-xs';

  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center ${className}`}>
      <div
        className={`relative flex items-center justify-center overflow-hidden ${containerClasses} ${defaultBorder}`}
      >
        {isCustomAvatar ? (
          <Img
            src={finalSrc}
            alt={alt || user?.username || ''}
            onError={() => {
              logger.warn('Avatar image failed to load from:', finalSrc);
              setFailedSrc(finalSrc);
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
          className={`absolute z-30 flex items-center justify-center rounded-full bg-accent-red text-text-inverted shadow-xs border border-accent-red/40 ${sizeConfig.badge}`}
          {...tip(adminTitle, undefined, 'status')}
          aria-label={adminAriaLabel}
        >
          <OverseerEyeIcon className={sizeConfig.badgeIcon} />
        </span>
      )}
    </div>
  );
};

