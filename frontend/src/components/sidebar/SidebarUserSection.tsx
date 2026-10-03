'use client';
// frontend/src/components/sidebar/SidebarUserSection.tsx
import type { UserProfile } from '@/context/AuthContext';
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { Button } from '@/components/common/Button';
import Link from 'next/link';
import { LogIn, LogOut, MailWarning } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { OverseerEyeIcon } from '@/components/icons/DbdIcons';

import { tip } from '@/components/common/Tooltip';
import { useDictionary } from "@/context/DictionaryContext";

export interface SidebarUserSectionProps {
  currentLocale: string;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  onOpenAuthModal: () => void;
  onOpenVerifyModal: () => void;
  onLogout: () => void;
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
      onNavigateMobile,
    }) => {
  const dict = useDictionary();
  return (
    <div className="mt-4 pt-3 border-t border-border-color">
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
        <div className="rounded-xl border border-border-color bg-bg-elevated p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <Link
              href={`/${currentLocale}/user`}
              onClick={onNavigateMobile}
              className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
            >
              <UserAvatar user={user} size="sm" />
              <div className="truncate">
                <p className="flex items-center gap-1 type-strong text-text-primary truncate">
                  <span className="truncate">{user.username}</span>
                  {user.is_verified === false && (
                    <MailWarning
                      className="h-3 w-3 shrink-0 text-accent-amber"
                      aria-label={dict.sidebar.emailNotVerified}
                    />
                  )}
                </p>
                <span
                  className={`inline-block rounded px-1 text-micro font-black uppercase tracking-wider ${
                    user.role === 'admin'
                      ? 'bg-accent-red/20 text-accent-red border border-accent-red/30'
                      : 'bg-bg-surface text-text-muted border border-border-color'
                  }`}
                >
                  {user.role}
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              {isAdmin && (
                <Link
                  href={`/${currentLocale}/admin`}
                  title={dict.sidebar.adminControlCenter}
                  aria-label={dict.sidebar.adminControlCenter}
                  onClick={onNavigateMobile}
                  className="p-1 rounded-lg text-accent-red hover:bg-accent-red/10 transition-colors"
                >
                  <OverseerEyeIcon className="h-4 w-4" />
                </Link>
              )}
              <button
                type="button"
                onClick={onLogout}
                {...tip(dict.sidebar.signOut, undefined, 'action')}
                aria-label={dict.sidebar.signOut}
                className="p-1 rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {user.is_verified === false && (
            <button
              type="button"
              onClick={onOpenVerifyModal}
              className="w-full text-left type-micro text-accent-amber hover:underline cursor-pointer"
            >
              {dict.sidebar.emailNotVerified}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

