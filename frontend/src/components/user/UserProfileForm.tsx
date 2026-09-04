'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/user/UserProfileForm.tsx

import React, { useState } from 'react';
import { Key, Lock, Mail, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { StatusFeedback } from '@/types/userProfile';
import { updateUserProfile, ApiError } from '@/services/userProfileApi';

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

  const [newEmail, setNewEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusFeedback | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (newPassword && newPassword.length < 6) {
      setStatusMessage({
        type: 'error',
        text: dict?.user?.passwordTooShort || 'Password must be at least 6 characters long.',
      });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setStatusMessage({
        type: 'error',
        text: dict?.user?.passwordsDoNotMatch || 'New passwords do not match.',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const body: Record<string, string> = {};
      if (newEmail && newEmail !== initialEmail) body.email = newEmail;
      if (newPassword) body.new_password = newPassword;

      await updateUserProfile(body);
      setStatusMessage({
        type: 'success',
        text: dict?.user?.profileUpdateSuccessMsg || 'Profile updated successfully!',
      });
      setNewPassword('');
      setConfirmPassword('');
      await onRefreshUser();
    } catch (err: unknown) {
      const fallback =
        err instanceof ApiError && err.code === 'authTokenMissing'
          ? dict?.user?.authTokenMissing || 'Authentication token missing. Please log in again.'
          : dict?.user?.profileUpdateFailedMsg || 'Failed to update profile.';
      const errorMsg = err instanceof ApiError ? err.message || fallback : fallback;
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsUpdating(false);
    }
  };

  const passwordsMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);

  return (
    <div className="rounded-3xl border border-border-color bg-bg-surface p-6 sm:p-8 backdrop-blur-xl shadow-xl w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-border-color">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-accent-amber/15 text-accent-amber border border-accent-amber/30">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-text-primary font-mono">
              {t.profileTitle}
            </h2>
            {t.profileSubtitle && (
              <p className="text-xs text-text-secondary mt-0.5 font-mono">
                {t.profileSubtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          className={`flex items-center gap-2.5 rounded-2xl border p-3.5 text-xs shadow-sm font-mono ${
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

      <form onSubmit={handleUpdateProfile} className="space-y-6">
        {/* Email Address */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary font-mono">
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
              className="w-full rounded-xl border border-border-color bg-bg-elevated pl-10 pr-4 py-2.5 text-xs text-text-primary placeholder-text-muted focus:border-accent-amber focus:outline-none focus:ring-1 focus:ring-accent-amber transition-all shadow-inner font-mono"
            />
          </div>
        </div>

        {/* Password Management */}
        <div className="space-y-4 pt-2 border-t border-border-color">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2 font-mono">
              <Lock className="h-3.5 w-3.5 text-accent-amber" />
              <span>{t.newPassword || 'Change Password'}</span>
            </span>
            <span className="text-[11px] text-text-muted font-mono">
              {t.passwordPlaceholder || 'Leave blank to keep current'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New Password Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary font-mono">
                {t.newPassword || 'New Password'}
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder={t.passwordPlaceholder || 'Leave blank to keep current'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-border-color bg-bg-elevated px-3.5 pr-10 py-2.5 text-xs text-text-primary placeholder-text-muted focus:border-accent-amber focus:outline-none focus:ring-1 focus:ring-accent-amber transition-all shadow-inner font-mono"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-primary cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary font-mono">
                {t.confirmPassword || 'Confirm New Password'}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t.confirmPasswordPlaceholder || 'Repeat new password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full rounded-xl border bg-bg-elevated px-3.5 pr-10 py-2.5 text-xs text-text-primary placeholder-text-muted focus:outline-none transition-all shadow-inner font-mono ${
                    passwordsMatch
                      ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                      : 'border-border-color focus:border-accent-amber focus:ring-1 focus:ring-accent-amber'
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-primary cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button & Security Assurance */}
        <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border-color">
          <div className="flex items-center gap-2 text-xs text-text-muted font-mono">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{dict?.user?.profileTitle || 'Encrypted Credentials'}</span>
          </div>

          <button
            type="submit"
            disabled={isUpdating}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-amber to-accent-red px-6 py-2.5 text-xs font-black uppercase tracking-wider text-text-inverted shadow-lg shadow-accent-amber/20 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer font-mono"
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
  );
};
