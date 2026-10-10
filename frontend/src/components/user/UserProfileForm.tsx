'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/user/UserProfileForm.tsx

import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { StatusFeedback } from '@/types/userProfile';
import { updateUserProfile, ApiError, type UpdateProfilePayload } from '@/services/userProfileApi';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { useDictionary } from "@/context/DictionaryContext";

interface UserProfileFormProps {
  initialEmail: string;
  onRefreshUser: () => Promise<void>;
  t?: Record<string, string>;
}

export const UserProfileForm: React.FC<UserProfileFormProps> = ({ initialEmail, onRefreshUser, t: propT }) => {
  const dict = useDictionary();
  const t: Record<string, string> = propT || dict.user || {};
  const [isExpanded, toggleExpanded] = usePersistentDrawer('lemondbd_drawer_account', false);

  const [newEmail, setNewEmail] = useState(initialEmail);
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
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

    const payload: UpdateProfilePayload = {};
    if (newEmail !== initialEmail && newEmail.trim()) {
      payload.email = newEmail.trim();
    }
    if (newPassword) {
      payload.new_password = newPassword;
    }

    // Nothing to update
    if (Object.keys(payload).length === 0) {
      return;
    }

    // The server wants the current password for either change.
    if (!currentPassword) {
      setStatusMessage({
        type: 'error',
        text: t.currentPasswordRequired || 'Enter your current password to change your email or password.',
      });
      return;
    }
    payload.current_password = currentPassword;

    setIsUpdating(true);
    try {
      await updateUserProfile(payload);
      setStatusMessage({
        type: 'success',
        text: t.profileUpdateSuccessMsg || 'Profile updated successfully!',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await onRefreshUser();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 403) {
        setStatusMessage({
          type: 'error',
          text: t.currentPasswordIncorrect || 'Your current password is incorrect.',
        });
      } else if (err instanceof ApiError) {
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
          style={{ backgroundImage: "url('/images/banners/banner_account.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-surface via-bg-surface/75 to-bg-surface pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-border-color/60 pointer-events-none" />

        <div className="relative z-10 w-8 hidden sm:block" aria-hidden="true" />
        <div className="relative z-10 flex-1 text-center">
          <h2 className="type-section-title text-text-primary group-hover:text-accent-red transition-colors">
            {dict.user.tabSanctum}
          </h2>
          <p className="type-section-subtitle text-text-secondary mt-0.5">
            {dict.user.accountSettingsSubtitle}
          </p>
        </div>
        <div className="relative z-10 w-8 flex justify-end">
          <ChevronDown
            className={`h-4 w-4 sm:h-5 sm:w-5 2xl:h-6 2xl:w-6 text-accent-red transition-transform duration-300 ease-in-out ${
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
                className={`max-w-2xl mx-auto flex items-center gap-2.5 rounded-2xl border p-3 text-xs shadow-sm ${
                  statusMessage.type === 'success'
                    ? 'border-accent-green/30 bg-accent-green/10 text-accent-green'
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
                  <label className="block type-label-xs text-text-secondary">
                    {dict.user.emailLabel}
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Input
                      type="email"
                      required
                      fieldSize="sm"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Current password: proves it is really the owner changing the email / password */}
                <div className="space-y-1.5">
                  <label className="block type-label-xs text-text-secondary" htmlFor="profile-current-password">
                    {t.currentPassword || 'Current Password'}
                  </label>
                  <div className="relative">
                    <Input
                      id="profile-current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      fieldSize="sm"
                      className="pr-9"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-text-muted hover:text-text-primary cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="type-caption text-text-muted">
                    {t.currentPasswordHint || 'Required to change your email or password'}
                  </p>
                </div>

                {/* Password Management */}
                <div className="space-y-3 pt-3 border-t border-border-color">
                  <div className="flex items-center justify-between">
                    <span className="type-label-sm text-text-primary flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-accent-amber" />
                      <span>{dict.user.passwordLabel}</span>
                    </span>
                    <span className="type-caption text-text-muted">
                      {t.passwordPlaceholder || 'Leave blank to keep current'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* New Password Input */}
                    <div className="space-y-1">
                      <label className="block type-label-2xs text-text-secondary">
                        {t.newPassword || 'New Password'}
                      </label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          fieldSize="sm"
                          className="pr-9"
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
                      <label className="block type-label-2xs text-text-secondary">
                        {t.confirmPassword || 'Confirm New Password'}
                      </label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          fieldSize="sm"
                          invalid={!!confirmPassword && !passwordsMatch}
                          className={`pr-9 ${
                            confirmPassword && passwordsMatch
                              ? 'border-accent-green/50 focus:border-accent-green focus:ring-accent-green'
                              : ''
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
                <Button type="submit" variant="primary" size="sm" loading={isUpdating} className="w-full sm:w-auto">
                  <span>{t.saveChanges || 'Save'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
