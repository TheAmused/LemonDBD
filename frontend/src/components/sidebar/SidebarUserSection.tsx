'use client';
// frontend/src/components/sidebar/SidebarUserSection.tsx
import type { UserProfile } from '@/context/AuthContext';

import React from 'react';
import { Button } from '@/components/common/Button';
import Link from 'next/link';
import { LogIn, LogOut, Pencil } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';

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
  onOpenAuthModal: () => void;
  onOpenVerifyModal: () => void;
  onLogout: () => void;
  onOpenInsults: () => void;
  /** Warms the dialog's code so the first click does not wait for the download. */
  onPreloadInsults?: () => void;
  onNavigateMobile?: () => void;
}

export const SidebarUserSection: React.FC<SidebarUserSectionProps> = ({
      currentLocale,
      user,
      isAuthenticated,
      onOpenAuthModal,
      onOpenVerifyModal,
      onLogout,
      onOpenInsults,
      onPreloadInsults,
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
        icon={Pencil}
        isActive={false}
        hasPopup="dialog"
        onClick={onOpenInsults}
        onWarm={onPreloadInsults}
      />
      {!isAuthenticated || !user ? (
        <Button
          variant="soft"
          onClick={onOpenAuthModal}
          leftIcon={<LogIn className="icon-md" />}
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
                  {user.role === 'admin' ? dict.user.roleAdmin : dict.sidebar.roleUser}
                </Badge>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                onClick={onLogout}
                {...tip(dict.sidebar.signOut, undefined, 'action')}
                aria-label={dict.sidebar.signOut}
                variant="ghost" size="xs" icon
              >
                <LogOut />
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

