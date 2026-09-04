'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/user/UserProfileForm.tsx

import React, { useState } from 'react';
import { Key, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [statusMessage, setStatusMessage] = useState<StatusFeedback | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: dict?.user?.passwordsDoNotMatch || 'New passwords do not match.' });
      return;
    }

    setIsUpdating(true);
    try {
      const body: Record<string, string> = {};
      if (newEmail && newEmail !== initialEmail) body.email = newEmail;
      if (newPassword) body.new_password = newPassword;

      await updateUserProfile(body);
      setStatusMessage({ type: 'success', text: dict?.user?.profileUpdateSuccessMsg || 'Profile updated successfully!' });
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

  return (
    <div className="rounded-3xl border border-border-color bg-bg-surface p-5 sm:p-8 backdrop-blur-xl shadow-md w-full">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-color">
        <Key className="h-5 w-5 text-accent-amber" />
        <div>
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-text-primary font-mono">
            {t.profileTitle || 'Account Credentials & Settings'}
          </h2>
          {t.profileSubtitle && (
            <p className="text-xs text-text-secondary mt-0.5">
              {t.profileSubtitle}
            </p>
          )}
        </div>
      </div>

      {statusMessage && (
        <div
          className={`mb-5 flex items-center gap-2.5 rounded-xl border p-3 text-xs shadow-sm ${
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

      <form onSubmit={handleUpdateProfile} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 font-mono">
            {dict?.user?.emailLabel || 'Email Address'}
          </label>
          <input
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full rounded-xl border border-border-color bg-bg-elevated px-4 py-2.5 text-xs text-text-primary placeholder-text-muted focus:border-accent-amber focus:outline-none focus:ring-1 focus:ring-accent-amber transition-all shadow-inner font-mono"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 font-mono">
              {t.newPassword || 'New Password (Optional)'}
            </label>
            <input
              type="password"
              placeholder={t.passwordPlaceholder || 'Leave blank to keep current'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-border-color bg-bg-elevated px-4 py-2.5 text-xs text-text-primary placeholder-text-muted focus:border-accent-amber focus:outline-none focus:ring-1 focus:ring-accent-amber transition-all shadow-inner font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 font-mono">
              {t.confirmPassword || 'Confirm New Password'}
            </label>
            <input
              type="password"
              placeholder={t.confirmPasswordPlaceholder || 'Repeat new password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-border-color bg-bg-elevated px-4 py-2.5 text-xs text-text-primary placeholder-text-muted focus:border-accent-amber focus:outline-none focus:ring-1 focus:ring-accent-amber transition-all shadow-inner font-mono"
            />
          </div>
        </div>

        <div className="pt-3">
          <button
            type="submit"
            disabled={isUpdating}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-amber to-accent-red px-6 py-3 text-xs font-black uppercase tracking-wider text-text-inverted shadow-lg shadow-accent-amber/20 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer font-mono"
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
