'use client';
// frontend/src/components/sidebar/SidebarUserSection.tsx
import type { UserProfile } from '@/context/AuthContext';

import React from 'react';
import { Button } from '@/components/common/Button';
import Link from 'next/link';
import { LogIn, LogOut } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { OverseerEyeIcon, QuillEditIcon } from '@/components/icons/DbdIcons';

import { tip } from '@/components/common/Tooltip';
import { useDictionary } from "@/context/DictionaryContext";
import { useSiteConfig } from '@/context/SiteConfigContext';
import { mustConfirmEmail } from '@/utils/emailVerification';
import { Badge } from '@/components/common/Badge';
import { Surface } from '@/components/common/Surface';
import { SidebarNavLink } from './SidebarNavLink';

export interface SidebarUserSectionProps {
  currentLocale: string;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  onOpenAuthModal: () => void;
  onOpenVerifyModal: () => void;
  onLogout: () => void;
  onOpenInsults: () => void;
  onNavigateMobile?: () => void;
}

export const SidebarUserSection: React.FC<SidebarUserSectionProps> = ({
      currentLocale,
      user,
      isAuthenticated,
      isAdmin,
      onOpenAuthModal,
      onOpenVerifyModal,
      onLogout,
      onOpenInsults,
      onNavigateMobile,
    }) => {
  const dict = useDictionary();
  const verificationRequired = useSiteConfig().features.emailVerificationRequired;
  return (
    <div className="mt-4 pt-3 border-t border-border-color space-y-3">
      {/* Opens a dialog, so it is a button rather than a page link. */}
      <SidebarNavLink
        id="bard-insults"
        label={dict.sidebar.insultsButton}
        icon={QuillEditIcon}
        isActive={false}
        hasPopup="dialog"
        onClick={onOpenInsults}
      />
      {!isAuthenticated || !user ? (
        <Button
          variant="soft"
          onClick={onOpenAuthModal}
          leftIcon={<LogIn className="h-4 w-4" />}
          className="w-full"
        >
          <span>{dict.sidebar.signIn}</span>
        </Button>
      ) : (
        <Surface tone="elevated" padding="none" className="p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <Link
              href={`/${currentLocale}/user`}
              onClick={onNavigateMobile}
              className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
            >
              <UserAvatar user={user} size="sm" />
              <div className="truncate">
                <p className="type-strong text-text-primary truncate">{user.username}</p>
                <Badge
                  tone={user.role === 'admin' ? 'red' : 'neutral'} size="xs" square className="inline-block"
                >
                  {user.role}
                </Badge>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              {isAdmin && (
                <Link
                  href={`/${currentLocale}/admin`}
                  {...tip(dict.sidebar.adminControlCenter, undefined, 'action')}
                  aria-label={dict.sidebar.adminControlCenter}
                  onClick={onNavigateMobile}
                  className="p-1 rounded-control text-accent-red hover:bg-accent-red/10 transition-colors"
                >
                  <OverseerEyeIcon className="h-4 w-4" />
                </Link>
              )}
              <Button
                type="button"
                onClick={onLogout}
                {...tip(dict.sidebar.signOut, undefined, 'action')}
                aria-label={dict.sidebar.signOut}
                variant="ghost" size="xs" icon
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {mustConfirmEmail(user, verificationRequired) && (
            <Button
              type="button"
              onClick={onOpenVerifyModal}
              variant="link" size="xs" className="w-full justify-start"
            >
              {dict.sidebar.emailNotVerified}
            </Button>
          )}
        </Surface>
      )}
    </div>
  );
};

