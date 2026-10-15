'use client';
// frontend/src/components/user/UserProfileForm.tsx

import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { StatusFeedback } from '@/types/userProfile';
import { updateUserProfile, ApiError, type UpdateProfilePayload } from '@/services/userProfileApi';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { tip } from '@/components/common/Tooltip';
import { DownloadDataSection } from '@/components/user/DownloadDataSection';
import { DeleteAccountSection } from '@/components/user/DeleteAccountSection';
import { useDictionary } from "@/context/DictionaryContext";
import { useAuth } from '@/context/AuthContext';
import { twoFactorErrorMessage } from '@/utils/twoFactorErrors';
import { TwoFactorSection } from '@/components/user/TwoFactorSection';
import { AccordionSection } from '@/components/common/AccordionSection';

interface UserProfileFormProps {
  login: string;
  initialUsername: string;
  initialEmail: string;
  twoFactorEnabled?: boolean;
  hasPassword?: boolean;
  onRefreshUser: () => Promise<void>;
  t?: Record<string, string>;
}

export const UserProfileForm: React.FC<UserProfileFormProps> = ({
  login,
  initialUsername,
  initialEmail,
  twoFactorEnabled = false,
  hasPassword = true,
  onRefreshUser,
  t: propT,
}) => {
  const dict = useDictionary();
  const t: Record<string, string> = propT || dict.user || {};
  const [isExpanded, toggleExpanded] = usePersistentDrawer('lemondbd_drawer_account', false);

  const [newUsername, setNewUsername] = useState(initialUsername);
  const [newEmail, setNewEmail] = useState(initialEmail);
  const [currentPassword, setCurrentPassword] = useState('');
  // Set once the server says the account has two-factor on: the change then needs a code as well.
  const [needsTwoFactorCode, setNeedsTwoFactorCode] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorRefresh, setTwoFactorRefresh] = useState(0);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusFeedback | null>(null);
  const [isSendingSetPassword, setIsSendingSetPassword] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSendSetPasswordLink = async () => {
    setStatusMessage(null);
    setIsSendingSetPassword(true);
    const res = await forgotPassword(initialEmail);
    setIsSendingSetPassword(false);
    setStatusMessage(
      res.success
        ? { type: 'success', text: t.setPasswordSent }
        : { type: 'error', text: res.error || t.profileUpdateFailedMsg || 'Failed to update profile.' }
    );
  };

  const passwordsMatch = newPassword === confirmPassword;
  const requiresTwoFactor = twoFactorEnabled || needsTwoFactorCode;

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
    if (newUsername.trim() !== initialUsername && newUsername.trim()) {
      payload.username = newUsername.trim();
    }
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

    const needsPassword = Boolean(payload.username || payload.email || payload.new_password);
    if (needsPassword && !currentPassword) {
      setStatusMessage({
        type: 'error',
        text: t.currentPasswordRequired || 'You must enter your current password to update your account details.',
      });
      return;
    }
    if (needsPassword) {
      payload.current_password = currentPassword;
    }
    if (needsPassword && requiresTwoFactor) {
      if (!twoFactorCode.trim()) {
        setStatusMessage({ type: 'error', text: dict.twoFactor.codeRequiredHint });
        return;
      }
      payload.two_factor_code = twoFactorCode.trim();
    }

    setIsUpdating(true);
    try {
      await updateUserProfile(payload);
      setStatusMessage({
        type: 'success',
        text: t.profileUpdateSuccessMsg || 'Profile updated successfully!',
      });
      setCurrentPassword('');
      setTwoFactorCode('');
      setNeedsTwoFactorCode(false);
      setNewPassword('');
      setConfirmPassword('');
      setTwoFactorRefresh((n) => n + 1);
      await onRefreshUser();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'two_factor_required') {
        setNeedsTwoFactorCode(true);
        setStatusMessage({ type: 'error', text: dict.twoFactor.codeRequiredHint });
      } else if (err instanceof ApiError && err.code && err.code !== 'incorrect_password' && err.code.includes('two_factor')) {
        setStatusMessage({ type: 'error', text: twoFactorErrorMessage(dict.twoFactor, err.code) });
      } else if (err instanceof ApiError && err.status === 403) {
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
    <AccordionSection
      title={dict.user.tabSanctum}
      open={isExpanded}
      onToggle={toggleExpanded}
      banner="/images/banners/banner_account.webp"
      bodyClassName="space-y-4 p-4 sm:p-6 2xl:p-8"
    >
      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          className={`max-w-2xl mx-auto flex items-center gap-2.5 rounded-card border p-3 text-xs shadow-sm ${
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
          <div className="space-y-1.5">
            <label className="block type-label-xs text-text-secondary" htmlFor="profile-login">
              {t.loginLabel}
            </label>
            <Input id="profile-login" type="text" disabled fieldSize="sm" value={login} />
          </div>

          <div className="space-y-1.5">
            <label className="block type-label-xs text-text-secondary" htmlFor="profile-username">
              {t.usernameLabel}
            </label>
            <Input
              id="profile-username"
              type="text"
              required
              minLength={3}
              maxLength={50}
              readOnly={!hasPassword}
              fieldSize="sm"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
            />
          </div>

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
                readOnly={!hasPassword}
                fieldSize="sm"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Current password: proves it is really the owner changing the email / password */}
          {hasPassword && (
          <div className="space-y-1.5">
            <label className="block type-label-xs text-text-secondary" htmlFor="profile-current-password">
              {t.currentPassword || 'Current Password'}
              <span
                className="ml-1 text-accent-red"
                aria-hidden="true"
                {...tip(t.currentPasswordHint || 'Required to update your account details', undefined, 'action')}
              >
                *
              </span>
            </label>
            <div className="relative">
              <Input
                id="profile-current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                aria-required="true"
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
          </div>
          )}

          {hasPassword && requiresTwoFactor && (
            <div className="space-y-1.5">
              <label className="block type-label-xs text-text-secondary" htmlFor="profile-two-factor-code">
                {dict.twoFactor.codeOrRecoveryLabel}
              </label>
              <Input
                id="profile-two-factor-code"
                type="text"
                autoComplete="one-time-code"
                spellCheck={false}
                fieldSize="sm"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
              />
            </div>
          )}

          {!hasPassword && (
            <div className="space-y-3 pt-3 border-t border-border-color">
              <span className="type-label-sm text-text-primary flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-accent-amber" />
                <span>{t.setPasswordTitle}</span>
              </span>
              <p className="type-caption text-text-secondary">{t.setPasswordDesc}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={isSendingSetPassword}
                onClick={handleSendSetPasswordLink}
                leftIcon={<Mail className="h-3.5 w-3.5" />}
              >
                <span>{t.setPasswordButton}</span>
              </Button>
            </div>
          )}

          {/* Password Management */}
          {hasPassword && (
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
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <DownloadDataSection iconOnly />
            <DeleteAccountSection iconOnly />
          </div>
          <Button type="submit" variant="primary" size="sm" loading={isUpdating} className="flex-1 sm:flex-none min-w-0">
            <span>{t.saveChanges || 'Save'}</span>
          </Button>
        </div>
      </form>

      {/* Optional second sign-in step (authenticator app) inside Account Management */}
      <TwoFactorSection
        refreshTrigger={twoFactorRefresh}
        onStatusChange={onRefreshUser}
        needsPassword={!hasPassword}
      />
    </AccordionSection>
  );
};
