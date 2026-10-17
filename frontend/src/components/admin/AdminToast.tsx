'use client';
// frontend/src/components/admin/AdminToast.tsx
//
// The outcome of the last admin action, pinned top right so it is seen wherever on the page the
// action was taken. Successes leave on their own; errors stay longer, both can be dismissed.
import React from 'react';
import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { Toast } from '@/components/common/Toast';
import { TOAST_DURATION_MS } from '@/constants/timing';
import { useDictionary } from '@/context/DictionaryContext';
import type { ActionMessage } from '@/types/admin';

export function AdminToast({ message, onDismiss }: { message: ActionMessage | null; onDismiss: () => void }) {
  const dict = useDictionary();

  if (!message) return null;
  const success = message.type === 'success';
  return (
    <Toast
      tone={success ? 'green' : 'red'}
      icon={success ? <CheckCircle2 className="icon-md" aria-hidden="true" /> : <TriangleAlert className="icon-md" aria-hidden="true" />}
      message={message.text}
      onDismiss={onDismiss}
      autoDismissMs={TOAST_DURATION_MS[message.type]}
      dismissLabel={dict.admin.close}
    />
  );
}
