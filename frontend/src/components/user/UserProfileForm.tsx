'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/user/UserProfileForm.tsx

import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { StatusFeedback } from '@/types/userProfile';
import { updateUserProfile, ApiError } from '@/services/userProfileApi';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';

interface UserProfileFormProps {
  initialEmail: string;
  onRefreshUser: () => Promise<void>;
  dict?: Dictionary;
  t?: Record<string, string>;
}

export const UserProfileForm: React.FC<UserProfileFormProps> = ({
  initialEmail,
  onRefreshUser,
  dict,
  t: propT,
}) => {
  const t: Record<string, string> = propT || dict?.user || {};
  const [isExpanded, toggleExpanded] = usePersistentDrawer('lemondbd_drawer_account', false);

  const [newEmail, setNewEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusFeedback | null>(null);

  const passwordsMatch = newPassword === confirmPassword;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    // Validation
    if (newPassword && newPassword.length < 6) {
      setStatusMessage({
        type: 'error',
        text: t.passwordTooShort || 'Password must be at least 6 characters long.',
      });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setStatusMessage({
        type: 'error',
        text: t.passwordsDoNotMatch || 'Passwords do not match.',
      });
      return;
    }

    const payload: { email?: string; password?: string } = {};
    if (newEmail !== initialEmail && newEmail.trim()) {
      payload.email = newEmail.trim();
    }
    if (newPassword) {
      payload.password = newPassword;
    }

    // Nothing to update
    if (Object.keys(payload).length === 0) {
      return;
    }

    setIsUpdating(true);
    try {
      await updateUserProfile(payload);
      setStatusMessage({
        type: 'success',
        text: t.profileUpdateSuccessMsg || 'Profile updated successfully!',
      });
      setNewPassword('');
      setConfirmPassword('');
      await onRefreshUser();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setStatusMessage({ type: 'error', text: err.message || t.profileUpdateFailedMsg || 'Failed to update profile.' });
      } else {
        setStatusMessage({
          type: 'error',
          text: t.profileUpdateFailedMsg || 'Failed to update profile.',
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="rounded-3xl border border-border-color bg-bg-surface backdrop-blur-xl shadow-md overflow-hidden transition-colors flex flex-col">
      {/* Header Button with DBD Banner */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="relative w-full flex items-center justify-between py-4 px-5 sm:py-4.5 sm:px-7 2xl:py-5.5 2xl:px-9 min-h-[72px] sm:min-h-[80px] cursor-pointer group select-none overflow-hidden transition-colors text-left"
        aria-expanded={isExpanded}
      >
        {/* Atmospheric DBD Banner Backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-30 mix-blend-luminosity filter pointer-events-none group-hover:scale-105 transition-transform duration-700 ease-out"
          style={{ backgroundImage: "url('/images/banners/banner_account.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-surface via-bg-surface/75 to-bg-surface pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-border-color/60 pointer-events-none" />

        <div className="relative z-10 w-8 hidden sm:block" aria-hidden="true" />
        <div className="relative z-10 flex-1 text-center">
          <h2 className="text-xs sm:text-sm 2xl:text-base font-black uppercase tracking-widest text-text-primary font-mono group-hover:text-accent-amber transition-colors">
            {dict?.user?.tabSanctum || 'Account Management'}
          </h2>
          <p className="text-[11px] sm:text-xs 2xl:text-sm text-text-secondary mt-0.5 font-mono">
            {dict?.user?.accountSettingsSubtitle || 'Manage your email address and password'}
          </p>
        </div>
        <div className="relative z-10 w-8 flex justify-end">
          <ChevronDown
            className={`h-4 w-4 sm:h-5 sm:w-5 2xl:h-6 2xl:w-6 text-accent-amber transition-transform duration-300 ease-in-out ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </div>
      </button>

      {/* Connected Account Management Drawer */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 sm:p-6 2xl:p-8 border-t border-border-color space-y-4">
            {/* Status Feedback Banner */}
            {statusMessage && (
              <div
                className={`max-w-2xl mx-auto flex items-center gap-2.5 rounded-2xl border p-3 text-xs shadow-sm font-mono ${
                  statusMessage.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-accent-red/30 bg-accent-red/10 text-accent-red'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="max-w-2xl w-full mx-auto space-y-4 sm:space-y-5">
              <div className="space-y-4 sm:space-y-5">
                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary font-mono">
                    {dict?.user?.emailLabel || 'Email Address'}
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full rounded-xl border border-border-color bg-bg-elevated pl-10 pr-4 py-2 text-xs text-text-primary placeholder-text-muted focus:border-accent-amber focus:outline-none focus:ring-1 focus:ring-accent-red transition-all shadow-inner font-mono"
                    />
                  </div>
                </div>

                {/* Password Management */}
                <div className="space-y-3 pt-3 border-t border-border-color">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2 font-mono">
                      <Lock className="h-3.5 w-3.5 text-accent-amber" />
                      <span>{dict?.user?.passwordLabel || 'Password'}</span>
                    </span>
                    <span className="text-[11px] text-text-muted font-mono">
                      {t.passwordPlaceholder || 'Leave blank to keep current'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* New Password Input */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary font-mono">
                        {t.newPassword || 'New Password'}
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder={t.passwordPlaceholder || 'Leave blank to keep current'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full rounded-xl border border-border-color bg-bg-elevated px-3 pr-9 py-2 text-xs text-text-primary placeholder-text-muted focus:border-accent-amber focus:outline-none focus:ring-1 focus:ring-accent-red transition-all shadow-inner font-mono"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-text-muted hover:text-text-primary cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password Input */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary font-mono">
                        {t.confirmPassword || 'Confirm New Password'}
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder={t.confirmPasswordPlaceholder || 'Repeat new password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`w-full rounded-xl border bg-bg-elevated px-3 pr-9 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none transition-all shadow-inner font-mono ${
                            passwordsMatch
                              ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                              : 'border-border-color focus:border-accent-amber focus:ring-1 focus:ring-accent-red'
                          }`}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-text-muted hover:text-text-primary cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 flex items-center justify-end border-t border-border-color">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-amber to-accent-red px-5 py-2 text-xs font-black uppercase tracking-wider text-text-inverted shadow-md shadow-accent-amber/20 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer font-mono"
                >
                  {isUpdating ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-text-inverted border-t-transparent" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{t.saveChanges || 'Save Changes'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
