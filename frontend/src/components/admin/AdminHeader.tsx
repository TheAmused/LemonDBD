'use client';
// frontend/src/components/admin/AdminHeader.tsx
//
// The one refresh that reloads whatever section is open; it sits in the navigation row.
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';

export function AdminHeader({ onRefresh }: { onRefresh: () => void }) {
  const dict = useDictionary();
  const t = dict.admin;

  return (
    <>
      <h1 className="sr-only">{dict.sidebar.adminControlCenter}</h1>
      <Button size="sm" onClick={onRefresh} leftIcon={<RefreshCw aria-hidden="true" />} {...tip(t.refreshTitle, undefined, 'action')}>
        {t.refresh}
      </Button>
    </>
  );
}
