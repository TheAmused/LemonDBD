'use client';
// frontend/src/components/admin/AdminSettingsPanel.tsx
//
// Admin "Configuration" tab: the few values the site quotes publicly (Privacy Policy) and
// enforces (token lifetimes, streak inactivity). Saved values override the config/env
// default; "Use default" removes the override.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Settings2 } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { ActionMessage, AdminSiteSetting } from '@/types/admin';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { backendBase } from '@/utils/staticUrl';
import { authHeaders, getErrorMessage } from '@/utils/api';

interface AdminSettingsPanelProps {
  onActionMessage: (msg: ActionMessage) => void;
  dict?: Dictionary;
}

const GROUP_ORDER: AdminSiteSetting['group'][] = ['privacy', 'tokens', 'retention'];

export const AdminSettingsPanel: React.FC<AdminSettingsPanelProps> = ({ onActionMessage, dict }) => {
  const t = (dict?.admin || {}) as Record<string, string>;
  const [settings, setSettings] = useState<AdminSiteSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyServerRows = useCallback((rows: AdminSiteSetting[]) => {
    setSettings(rows);
    setDrafts(Object.fromEntries(rows.map((row) => [row.key, String(row.value)])));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendBase}/api/v1/admin/settings`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('load failed');
      applyServerRows((await res.json()).settings || []);
    } catch (err) {
      onActionMessage({ type: 'error', text: getErrorMessage(err, t.configLoadFailed || 'Failed to load configuration.') });
    } finally {
      setLoading(false);
    }
  }, [applyServerRows, onActionMessage, t.configLoadFailed]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (payload: Record<string, string | number | null>) => {
    setSaving(true);
    try {
      const res = await fetch(`${backendBase}/api/v1/admin/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: authHeaders(undefined, { json: true }),
        body: JSON.stringify({ settings: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onActionMessage({ type: 'error', text: data.error || t.configSaveFailed || 'Failed to save configuration.' });
        return;
      }
      applyServerRows(data.settings || []);
      onActionMessage({ type: 'success', text: t.configSaved || 'Configuration saved.' });
    } catch (err) {
      onActionMessage({ type: 'error', text: getErrorMessage(err, t.configSaveFailed || 'Failed to save configuration.') });
    } finally {
      setSaving(false);
    }
  };

  const changed = useMemo(
    () =>
      settings.filter((row) => (drafts[row.key] ?? '').trim() !== String(row.value)),
    [settings, drafts]
  );

  const handleSave = () => {
    if (changed.length === 0) {
      onActionMessage({ type: 'success', text: t.configNoChanges || 'No changes to save.' });
      return;
    }
    send(Object.fromEntries(changed.map((row) => [row.key, (drafts[row.key] ?? '').trim()])));
  };

  const labelFor = (key: string) => t[`config_${key}`] || key;
  const descFor = (key: string) => t[`config_${key}_desc`] || '';
  const groupLabel = (group: string) => t[`configGroup_${group}`] || group;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border-color bg-bg-surface p-5 shadow-sm backdrop-blur-sm">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-text-primary">
          <Settings2 className="h-4 w-4 text-accent-red" />
          <span>{t.configTitle || 'Site configuration'}</span>
        </h3>
        <p className="mt-1 text-xs text-text-muted">
          {t.configSubtitle || 'Changes apply immediately and are recorded in the audit log.'}
        </p>
      </div>

      {loading ? (
        <div className="py-10 text-center text-xs font-mono uppercase tracking-widest text-text-muted">…</div>
      ) : (
        <>
          {GROUP_ORDER.map((group) => {
            const rows = settings.filter((row) => row.group === group);
            if (rows.length === 0) return null;
            return (
              <section
                key={group}
                className="rounded-2xl border border-border-color bg-bg-surface p-5 shadow-sm backdrop-blur-sm"
              >
                <h4 className="pb-3 text-xs font-black uppercase tracking-widest text-accent-red font-mono">
                  {groupLabel(group)}
                </h4>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {rows.map((row) => (
                    <div key={row.key} className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`cfg-${row.key}`}
                        className="text-xs font-bold text-text-primary"
                      >
                        {labelFor(row.key)}
                      </label>
                      <Input
                        id={`cfg-${row.key}`}
                        type={row.kind === 'email' ? 'email' : 'number'}
                        inputMode={row.kind === 'email' ? 'email' : 'numeric'}
                        min={row.min ?? undefined}
                        max={row.max ?? undefined}
                        fieldSize="sm"
                        value={drafts[row.key] ?? ''}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [row.key]: e.target.value }))}
                        disabled={saving}
                      />
                      <p className="text-[11px] leading-snug text-text-muted">{descFor(row.key)}</p>
                      <div className="flex items-center gap-3 text-[11px] text-text-muted">
                        <span className="font-mono">
                          {(t.configDefaultValue || 'Default: {value}').replace(
                            '{value}',
                            String(row.default) || '—'
                          )}
                        </span>
                        {row.overridden ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => send({ [row.key]: null })}
                            className="cursor-pointer font-bold text-accent-red hover:underline disabled:opacity-50"
                          >
                            {t.configResetDefault || 'Use default'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          <div className="flex justify-end">
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              <span>{t.configSave || 'Save changes'}</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
