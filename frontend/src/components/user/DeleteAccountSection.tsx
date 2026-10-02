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

export const DeleteAccountSection: React.FC<{ dict?: Dictionary }> = ({ dict }) => {
  const t = (dict?.user || {}) as Record<string, string>;
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setPassword('');
    setError(null);
  };

  const confirm = async () => {
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      logout(); // the server already cleared the session cookie; this resets state and leaves /user
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(
        status === 403
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
            <Button variant="danger" onClick={confirm} loading={busy} disabled={!password} className="flex-1">
              <span>{t.deleteAccountConfirm}</span>
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 text-left">
          <p className="text-sm leading-relaxed text-text-muted">{t.deleteAccountConfirmDesc}</p>
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
          {error ? (
            <p role="alert" className="text-xs font-semibold text-accent-red">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
};
