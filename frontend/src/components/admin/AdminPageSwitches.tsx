'use client';
// frontend/src/components/admin/AdminPageSwitches.tsx
//
// Per-page kill switches: a switched-off page is hidden from guests and regular users, and the
// proxy + API refuse it even when someone types the address. Admins always keep access.

import React, { useCallback, useEffect, useState } from 'react';
import { Power } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { ActionMessage } from '@/types/admin';
import { Surface } from '@/components/common/Surface';
import { Switch } from '@/components/common/Switch';
import { buildMainNavItems } from '@/components/sidebar/mainNavItems';
import { useLocale } from '@/context/DictionaryContext';
import { refreshSitePages } from '@/hooks/useSitePages';
import { backendBase } from '@/utils/staticUrl';
import { authHeaders, getErrorMessage } from '@/utils/api';
import { isSitePageId, type SitePageId } from '@/utils/sitePages';

interface AdminPageSwitchesProps {
  onActionMessage: (msg: ActionMessage) => void;
  dict?: Dictionary;
}

interface PageRow {
  id: SitePageId;
  disabled: boolean;
}

export const AdminPageSwitches: React.FC<AdminPageSwitchesProps> = ({ onActionMessage, dict }) => {
  const locale = useLocale();
  const t = (dict?.admin || {}) as Record<string, string>;
  const [rows, setRows] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemOn, setSystemOn] = useState(true);
  const [busyId, setBusyId] = useState<SitePageId | null>(null);

  const items = buildMainNavItems(dict, locale);

  const applyRows = (raw: unknown, enabled?: unknown) => {
    if (typeof enabled === 'boolean') setSystemOn(enabled);
    const list = Array.isArray(raw) ? raw : [];
    setRows(
      list.flatMap((row: { id?: string; disabled?: boolean }) =>
        isSitePageId(row.id) ? [{ id: row.id, disabled: row.disabled === true }] : []
      )
    );
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${backendBase}/api/v1/admin/pages`, { credentials: 'include', headers: authHeaders() });
      if (!res.ok) throw new Error('load failed');
      const body = await res.json();
      applyRows(body.pages, body.enabled);
    } catch (err) {
      onActionMessage({ type: 'error', text: getErrorMessage(err, t.pageSwitchesLoadFailed || 'Failed to load the page switches.') });
    } finally {
      setLoading(false);
    }
  }, [onActionMessage, t.pageSwitchesLoadFailed]);

  useEffect(() => {
    load();
  }, [load]);

  const setLive = async (id: SitePageId, live: boolean, label: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`${backendBase}/api/v1/admin/pages/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: authHeaders(undefined, { json: true }),
        body: JSON.stringify({ disabled: !live }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onActionMessage({ type: 'error', text: data.error || t.pageSwitchFailed || 'Failed to update the page switch.' });
        return;
      }
      applyRows(data.pages, data.enabled);
      refreshSitePages();
      const template = live ? t.pageSwitchedOnMsg || '{page} is live again.' : t.pageSwitchedOffMsg || '{page} is now switched off for visitors.';
      onActionMessage({ type: 'success', text: template.replace('{page}', label) });
    } catch (err) {
      onActionMessage({ type: 'error', text: getErrorMessage(err, t.pageSwitchFailed || 'Failed to update the page switch.') });
    } finally {
      setBusyId(null);
    }
  };

  const offCount = rows.filter((row) => row.disabled).length;

  return (
    <Surface as="section" className="shadow-sm backdrop-blur-sm" aria-busy={loading}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 type-label text-text-primary">
            <Power className="h-4 w-4 text-accent-red" />
            <span>{t.pageSwitchesTitle || 'Page switches'}</span>
          </h3>
          <p className="mt-1 max-w-2xl type-body text-text-muted">
            {t.pageSwitchesSubtitle ||
              'Switch a page off to hide it from guests and regular users. Typing the address stops working too. Admins always keep access.'}
          </p>
        </div>
        {offCount > 0 ? (
          <span className="type-label-2xs shrink-0 rounded-lg border border-accent-red/30 bg-accent-red/10 px-2.5 py-1 text-accent-red">
            {(t.pagesOffCount || '{count} off').replace('{count}', String(offCount))}
          </span>
        ) : null}
      </div>

      {!systemOn ? (
        <p role="status" className="mb-4 rounded-xl border border-accent-amber/30 bg-accent-amber/10 px-3 py-2 type-strong text-accent-amber">
          {t.pageSwitchesSystemOff || 'Page switches are turned off on the server (PAGE_KILL_SWITCHES_ENABLED=false), so every page stays open.'}
        </p>
      ) : null}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const row = rows.find((r) => r.id === item.pageId);
          const live = row ? !row.disabled : true;
          const Icon = item.icon;
          return (
            <li
              key={item.pageId}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                live ? 'border-border-color bg-bg-elevated' : 'border-accent-red/40 bg-accent-red/5'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                  live ? 'border-border-color bg-bg-surface text-text-secondary' : 'border-accent-red/30 bg-accent-red/15 text-accent-red'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="type-strong truncate text-text-primary">{item.label}</p>
                <p className="type-caption truncate text-text-muted">/{item.pageId}</p>
              </div>
              <span
                className={`type-label-2xs shrink-0 ${live ? 'text-accent-green' : 'text-accent-red'}`}
              >
                {live ? t.pageSwitchLive || 'Live' : t.pageSwitchOff || 'Switched off'}
              </span>
              <span className={busyId === item.pageId || loading ? 'pointer-events-none opacity-50' : undefined}>
                <Switch
                  checked={live}
                  onChange={(next) => setLive(item.pageId, next, item.label)}
                  ariaLabel={(t.pageSwitchAria || 'Show {page} to visitors').replace('{page}', item.label)}
                />
              </span>
            </li>
          );
        })}
      </ul>
    </Surface>
  );
};
