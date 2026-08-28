import type { Dictionary } from '@/locales/types';
// frontend/src/components/sidebar/SidebarUserSection.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { LogIn, LogOut, Crown, MailWarning } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';

export interface SidebarUserSectionProps {
  currentLocale: string;
  dict?: Dictionary;
  user: any;
  isAuthenticated: boolean;
  isAdmin: boolean;
  onOpenAuthModal: () => void;
  onOpenVerifyModal: () => void;
  onLogout: () => void;
  onNavigateMobile?: () => void;
}

export const SidebarUserSection: React.FC<SidebarUserSectionProps> = ({
  currentLocale,
  dict,
  user,
  isAuthenticated,
  isAdmin,
  onOpenAuthModal,
  onOpenVerifyModal,
  onLogout,
  onNavigateMobile,
}) => {
  return (
    <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
      {!isAuthenticated || !user ? (
        <button
          type="button"
          onClick={onOpenAuthModal}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-red-600/10 border border-amber-500/30 hover:border-amber-500/60 p-2.5 text-xs font-bold text-amber-500 dark:text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer shadow-sm group"
        >
          <LogIn className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          <span>{dict?.sidebar?.signIn || 'Sign In / Register'}</span>
        </button>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-100/60 dark:border-slate-800/80 dark:bg-slate-900/60 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <Link
              href={`/${currentLocale}/user`}
              onClick={onNavigateMobile}
              className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
            >
              <UserAvatar user={user} size="sm" />
              <div className="truncate">
                <p className="flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  <span className="truncate">{user.username}</span>
                  {user.is_verified === false && (
                    <MailWarning
                      className="h-3 w-3 shrink-0 text-amber-500"
                      aria-label={dict?.sidebar?.emailNotVerified || 'Email not verified'}
                    />
                  )}
                </p>
                <span
                  className={`inline-block rounded px-1 text-[9px] font-black uppercase tracking-wider ${
                    user.role === 'admin'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
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
                  title={dict?.sidebar?.adminControlCenter || 'Admin Control Center'}
                  aria-label={dict?.sidebar?.adminControlCenter || 'Admin Control Center'}
                  onClick={onNavigateMobile}
                  className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Crown className="h-4 w-4" />
                </Link>
              )}
              <button
                type="button"
                onClick={onLogout}
                title={dict?.sidebar?.signOut || 'Sign Out'}
                aria-label={dict?.sidebar?.signOut || 'Sign Out'}
                className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {user.is_verified === false && (
            <button
              type="button"
              onClick={onOpenVerifyModal}
              className="w-full text-left text-[10px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              {dict?.sidebar?.emailNotVerified || 'Email not verified. Verify now'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

