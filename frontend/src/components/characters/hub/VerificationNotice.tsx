'use client';
// frontend/src/components/characters/hub/VerificationNotice.tsx
import React from 'react';
import { MailWarning } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import { InlineLink } from '@/components/common/InlineLink';
import { Button } from '@/components/common/Button';
import { Toast } from '@/components/common/Toast';

interface VerificationNoticeProps {
  onVerify: () => void;
  onDismiss: () => void;
}

/** Toast asking an unverified user to verify their email before using ownership mode. */
export function VerificationNotice({ onVerify, onDismiss }: VerificationNoticeProps) {
  const dict = useDictionary();

  return (
    <Toast
      tone="amberSolid"
      align="center"
      icon={<MailWarning className="icon-md" />}
      message={dict.user.verifyEmailRequired}
      actions={
        <>
          <Button variant="onAccent" size="xs" onClick={onVerify}>
            {dict.streaks.verifyEmail}
          </Button>
          <InlineLink tone="current" onClick={onDismiss} className="type-strong-xs">
            {dict.characterDetail.dismiss}
          </InlineLink>
        </>
      }
    />
  );
}
