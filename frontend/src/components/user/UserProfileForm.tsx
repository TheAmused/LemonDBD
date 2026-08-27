'use client';
// frontend/src/components/user/UserProfileForm.tsx

import React, { useState } from 'react';
import { Key, CheckCircle2, AlertCircle } from 'lucide-react';
import { StatusFeedback } from '@/types/userProfile';

interface UserProfileFormProps {
  initialEmail: string;
  onRefreshUser: () => Promise<void>;
  dict?: any;
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
      setStatusMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('lemondbd_token') : null;
    if (!token) {
      setStatusMessage({ type: 'error', text: 'Authentication token missing. Please log in again.' });
      return;
    }

    setIsUpdating(true);
    try {
      const backendBase = process.env.NEXT_PUBLIC_API_URL || '';
      const body: Record<string, string> = {};
      if (newEmail && newEmail !== initialEmail) body.email = newEmail;
      if (newPassword) body.new_password = newPassword;

      const res = await fetch(`${backendBase}/api/v1/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to update profile.' });
      } else {
        setStatusMessage({ type: 'success', text: 'Profile updated successfully!' });
        setNewPassword('');
        setConfirmPassword('');
        await onRefreshUser();
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error occurred.';
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5 sm:p-8 backdrop-blur-xl shadow-xl w-full">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
        <Key className="h-5 w-5 text-amber-400" />
        <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-100">
          {t.profileTitle || 'Account Credentials & Settings'}
        </h2>
      </div>

      {statusMessage && (
        <div
          className={`mb-5 flex items-center gap-2.5 rounded-xl border p-3 text-xs shadow-sm ${
            statusMessage.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
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
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            {dict?.user?.emailLabel || 'Email Address'}
          </label>
          <input
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-inner"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {t.newPassword || 'New Password (Optional)'}
            </label>
            <input
              type="password"
              placeholder={t.passwordPlaceholder || 'Leave blank to keep current'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {t.confirmPassword || 'Confirm New Password'}
            </label>
            <input
              type="password"
              placeholder={t.confirmPasswordPlaceholder || 'Repeat new password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="pt-3">
          <button
            type="submit"
            disabled={isUpdating}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-amber-950/40 hover:from-amber-400 hover:to-red-500 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isUpdating ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
