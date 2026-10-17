'use client';
// frontend/src/components/admin/AdminToast.tsx
//
// The outcome of the last admin action, pinned top right so it is seen wherever on the page the
// action was taken. Successes leave on their own; errors stay longer, both can be dismissed.
import React, { useEffect } from 'react';
import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { Toast } from '@/components/common/Toast';
import { useDictionary } from '@/context/DictionaryContext';
import type { ActionMessage } from '@/types/admin';

const VISIBLE_MS: Record<ActionMessage['type'], number> = { success: 4000, error: 9000 };

export function AdminToast({ message, onDismiss }: { message: ActionMessage | null; onDismiss: () => void }) {
  const dict = useDictionary();

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, VISIBLE_MS[message.type]);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;
  const success = message.type === 'success';
  return (
    <Toast
      tone={success ? 'green' : 'red'}
      icon={success ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <TriangleAlert className="h-4 w-4" aria-hidden="true" />}
      message={message.text}
      onDismiss={onDismiss}
      dismissLabel={dict.admin.close}
    />
  );
}
