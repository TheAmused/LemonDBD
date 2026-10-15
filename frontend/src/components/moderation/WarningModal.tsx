'use client';
// frontend/src/components/moderation/WarningModal.tsx
//
// Mounted in the root layout, so it must cost nothing on the pages where nobody has a warning:
// the dialog itself (and the Modal it drags in) is only fetched once there is one to show.

import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';

const WarningDialog = dynamic(() => import('./WarningDialog').then((m) => m.WarningDialog), { ssr: false });

export function WarningModal() {
  const { warnings } = useAuth();
  return warnings.length > 0 ? <WarningDialog /> : null;
}
