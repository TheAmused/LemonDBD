'use client';
// frontend/src/components/admin/AdminHeader.tsx
//
// The page title, the analytics dashboard (traffic and feature usage live in Umami) and the one
// refresh that reloads whatever section is open.
import React from 'react';
import { ExternalLink, LineChart, RefreshCw } from 'lucide-react';
import { Button, buttonClassName } from '@/components/common/Button';
import { IconTile } from '@/components/common/IconTile';
import { tip } from '@/components/common/Tooltip';
import { OverseerEyeIcon } from '@/components/icons/DbdIcons';
import { analyticsUrl } from '@/components/admin/adminLinks';
import { useDictionary } from '@/context/DictionaryContext';

export function AdminHeader({ onRefresh }: { onRefresh: () => void }) {
  const dict = useDictionary();
  const t = dict.admin;

  return (
    <header className="flex w-full flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3.5">
        <IconTile size="md">
          <OverseerEyeIcon className="h-6 w-6" aria-hidden="true" />
        </IconTile>
        <h1 className="type-page-title text-text-primary">{dict.sidebar.adminControlCenter}</h1>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={analyticsUrl()}
          target="_blank"
          rel="noopener noreferrer"
          {...tip(t.analyticsTitle, undefined, 'action')}
          className={buttonClassName('secondary', 'sm')}
        >
          <LineChart className="h-3.5 w-3.5" aria-hidden="true" />
          {t.analytics}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
        <Button size="sm" onClick={onRefresh} leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} {...tip(t.refreshTitle, undefined, 'action')}>
          {t.refresh}
        </Button>
      </div>
    </header>
  );
}
