'use client';
// frontend/src/components/user/TwoFactorConfirmModal.tsx
//
// The two actions that need the password *and* a code: turning two-factor off and generating a new
// set of recovery codes (which retires the old ones).

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';
import { RecoveryCodesPanel } from '@/components/user/RecoveryCodesPanel';
import { useDictionary } from '@/context/DictionaryContext';
import { ApiError } from '@/utils/api';
import { disableTwoFactor, regenerateRecoveryCodes } from '@/services/twoFactorApi';
import { twoFactorErrorMessage } from '@/utils/twoFactorErrors';
import { trackEvent } from '@/utils/analytics';

export type TwoFactorAction = 'disable' | 'regenerate';

interface TwoFactorConfirmModalProps {
  action: TwoFactorAction | null;
  onClose: () => void;
  /** The action went through (for "regenerate", after the new codes were saved). */
  onDone: () => void;
}

export const TwoFactorConfirmModal: React.FC<TwoFactorConfirmModalProps> = ({ action, onClose, onDone }) => {
  const t = useDictionary().twoFactor;
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);

  const reset = () => {
    setPassword('');
    setCode('');
    setError(null);
    setBusy(false);
    setNewCodes(null);
  };

  useEffect(() => {
    if (action === null) reset();
  }, [action]);

  const close = () => {
    if (busy || newCodes) return; // fresh recovery codes are shown once: only "Done" leaves
    reset();
    onClose();
  };

  const submit = async () => {
    if (!password || !code.trim() || busy || !action) return;
    setBusy(true);
    setError(null);
    try {
      if (action === 'disable') {
        await disableTwoFactor(password, code.trim());
        trackEvent('two_factor_change', { action: 'disabled' });
        reset();
        onDone();
      } else {
        setNewCodes(await regenerateRecoveryCodes(password, code.trim()));
        setPassword('');
        setCode('');
      }
    } catch (err) {
      setError(twoFactorErrorMessage(t, err instanceof ApiError ? err.code : undefined));
    } finally {
      setBusy(false);
    }
  };

  const isDisable = action === 'disable';

  return (
    <Modal
      isOpen={action !== null}
      onClose={close}
      variant="dialog"
      size="md"
      title={isDisable ? t.disableTitle : t.regenerateTitle}
      busy={busy || newCodes !== null}
      padded
    >
      {newCodes ? (
        <RecoveryCodesPanel
          codes={newCodes}
          onDone={() => {
            reset();
            onDone();
          }}
        />
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <p className="type-body-lg text-text-secondary">{isDisable ? t.disableIntro : t.regenerateIntro}</p>
          {error && (
            <p role="alert" className="rounded-xl border border-accent-red/30 bg-accent-red/10 p-3 type-strong text-accent-red">
              {error}
            </p>
          )}
          <Input
            type="password"
            autoComplete="current-password"
            aria-label={t.passwordLabel}
            placeholder={t.passwordLabel}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <Input
            type="text"
            autoComplete="one-time-code"
            spellCheck={false}
            aria-label={t.codeOrRecoveryLabel}
            placeholder={t.codeOrRecoveryLabel}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={close} disabled={busy} className="flex-1">
              <span>{t.cancelButton}</span>
            </Button>
            <Button
              type="submit"
              variant={isDisable ? 'danger' : 'primary'}
              loading={busy}
              disabled={!password || !code.trim()}
              className="flex-1"
            >
              <span>{isDisable ? t.disableButton : t.regenerateConfirm}</span>
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
