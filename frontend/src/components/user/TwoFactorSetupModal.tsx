'use client';
// frontend/src/components/user/TwoFactorSetupModal.tsx
//
// Turning two-factor on: confirm the password -> scan the QR code and prove the app works ->
// save the recovery codes. Nothing is switched on server-side until the code check passes.

import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';
import { CODE_LENGTH, CodeInput } from '@/components/auth/CodeInput';
import { QrCode } from '@/components/auth/QrCode';
import { RecoveryCodesPanel } from '@/components/user/RecoveryCodesPanel';
import { useDictionary } from '@/context/DictionaryContext';
import { ApiError } from '@/utils/api';
import { enableTwoFactor, startTwoFactorSetup, type TwoFactorSetup } from '@/services/twoFactorApi';
import { twoFactorErrorMessage } from '@/utils/twoFactorErrors';
import { trackEvent } from '@/utils/analytics';

type Step = 'password' | 'scan' | 'codes';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called once the codes were saved and the modal is done. */
  onEnabled: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({ isOpen, onClose, onEnabled }) => {
  const t = useDictionary().twoFactor;
  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setStep('password');
    setPassword('');
    setSetup(null);
    setCode('');
    setCodes([]);
    setError(null);
    setBusy(false);
    setKeyCopied(false);
  };

  useEffect(() => {
    if (!isOpen) reset();
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, [isOpen]);

  const close = () => {
    if (busy || step === 'codes') return; // the recovery codes are shown once: only "Done" leaves that step
    reset();
    onClose();
  };

  const fail = (err: unknown) => {
    setError(twoFactorErrorMessage(t, err instanceof ApiError ? err.code : undefined));
  };

  const begin = async () => {
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      setSetup(await startTwoFactorSetup(password));
      setStep('scan');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (code.length !== CODE_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    try {
      setCodes(await enableTwoFactor(code));
      trackEvent('two_factor_change', { action: 'enabled' });
      setPassword('');
      setSetup(null);
      setStep('codes');
    } catch (err) {
      fail(err);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const copyKey = async () => {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      setKeyCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setKeyCopied(false), 2000);
    } catch {
      // Clipboard blocked: the key is on screen to type by hand.
    }
  };

  const finish = () => {
    reset();
    onEnabled();
  };

  return (
    <Modal isOpen={isOpen} onClose={close} variant="dialog" size="md" centerTitle title={t.setupTitle} busy={busy || step === 'codes'} padded>
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-accent-red/30 bg-accent-red/10 p-3 type-strong text-accent-red">
          {error}
        </p>
      )}

      {step === 'password' && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            begin();
          }}
        >
          <p className="type-body-lg text-text-secondary">{t.setupPasswordIntro}</p>
          <Input
            type="password"
            autoComplete="current-password"
            aria-label={t.passwordLabel}
            placeholder={t.passwordLabel}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!error}
            autoFocus
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={close} disabled={busy} className="flex-1">
              <span>{t.cancelButton}</span>
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!password} className="flex-1">
              <span>{t.continueButton}</span>
            </Button>
          </div>
        </form>
      )}

      {step === 'scan' && setup && (
        <form
          className="flex flex-col items-center gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
        >
          <p className="type-body-lg text-text-secondary text-center">{t.scanIntro}</p>
          <QrCode value={setup.otpauth_uri} label={t.qrAlt} className="h-48 w-48 p-1" />
          <div className="flex w-full flex-col items-center gap-1.5">
            <span className="type-caption text-text-muted">{t.manualEntry}</span>
            <div className="flex items-center gap-2">
              <code className="break-all rounded-lg bg-bg-primary px-2.5 py-1.5 text-xs tracking-widest text-text-primary shadow-inner select-all">
                {setup.secret.match(/.{1,4}/g)?.join(' ')}
              </code>
              <Button type="button" variant="secondary" size="sm" onClick={copyKey} leftIcon={keyCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}>
                <span>{keyCopied ? t.copied : t.copyKey}</span>
              </Button>
            </div>
          </div>
          <div className="flex w-full flex-col items-center gap-2">
            <span className="type-label-xs text-text-secondary">{t.codeLabel}</span>
            <CodeInput value={code} onChange={setCode} disabled={busy} invalid={!!error} autoFocus />
          </div>
          <Button type="submit" variant="primary" loading={busy} disabled={code.length !== CODE_LENGTH} className="w-full">
            <span>{t.confirmButton}</span>
          </Button>
        </form>
      )}

      {step === 'codes' && <RecoveryCodesPanel codes={codes} onDone={finish} />}
    </Modal>
  );
};
