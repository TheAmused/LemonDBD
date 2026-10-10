'use client';
// frontend/src/components/user/DeleteAccountSection.tsx
//
// Self-service account deletion (GDPR erasure): password-confirmed, permanent.

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';
import { tip } from '@/components/common/Tooltip';
import { useAuth } from '@/context/AuthContext';
import { ApiError, deleteAccount } from '@/services/userProfileApi';
import { useDictionary } from "@/context/DictionaryContext";
import { twoFactorErrorMessage } from '@/utils/twoFactorErrors';

export const DeleteAccountSection: React.FC<{ }> = () => {
  const dict = useDictionary();
  const t = (dict.user || {}) as Record<string, string>;
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setPassword('');
    setCode('');
    setNeedsCode(false);
    setError(null);
  };

  const confirm = async () => {
    if (!password || busy || (needsCode && !code.trim())) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password, needsCode ? code.trim() : undefined);
      logout(); // the server already cleared the session cookie; this resets state and leaves /user
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      const apiCode = err instanceof ApiError ? err.code : undefined;
      if (apiCode === 'two_factor_required') setNeedsCode(true);
      setError(
        apiCode === 'two_factor_required'
          ? dict.twoFactor.codeRequiredHint
          : apiCode && apiCode.includes('two_factor')
            ? twoFactorErrorMessage(dict.twoFactor, apiCode)
            : status === 403
          ? t.deleteAccountWrongPassword
          : status === 400 && err instanceof Error && /administrator/i.test(err.message)
            ? t.deleteAccountLastAdmin
            : t.deleteAccountFailed
      );
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="danger"
        size="sm"
        onClick={() => setOpen(true)}
        leftIcon={<Trash2 className="h-3.5 w-3.5" />}
        aria-label={t.deleteAccountTitle || 'Delete account'}
        {...tip(t.deleteAccountTitle || 'Delete account', t.deleteAccountDesc, 'action')}
      >
        <span>{t.deleteAccountButton || 'Delete my account'}</span>
      </Button>

      <Modal
        isOpen={open}
        onClose={close}
        variant="confirm"
        tone="danger"
        title={t.deleteAccountConfirmTitle}
        busy={busy}
        padded
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row">
            <Button variant="secondary" onClick={close} disabled={busy} className="flex-1">
              <span>{t.deleteAccountCancel}</span>
            </Button>
            <Button variant="danger" onClick={confirm} loading={busy} disabled={!password || (needsCode && !code.trim())} className="flex-1">
              <span>{t.deleteAccountConfirm}</span>
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 text-left">
          <p className="type-body-lg text-text-muted">{t.deleteAccountConfirmDesc}</p>
          <Input
            type="password"
            autoComplete="current-password"
            placeholder={t.deleteAccountPassword}
            aria-label={t.deleteAccountPassword}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirm();
            }}
            invalid={!!error}
            autoFocus
          />
          {needsCode ? (
            <Input
              type="text"
              autoComplete="one-time-code"
              spellCheck={false}
              placeholder={dict.twoFactor.codeOrRecoveryLabel}
              aria-label={dict.twoFactor.codeOrRecoveryLabel}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirm();
              }}
            />
          ) : null}
          {error ? (
            <p role="alert" className="type-strong text-accent-red">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
};
