'use client';
// frontend/src/components/admin/AdminSettingsPanel.tsx
//
// Admin "Configuration" tab: the few values the site quotes publicly (Privacy Policy) and
// enforces (token lifetimes, streak inactivity). Saved values override the config/env
// default; "Use default" removes the override.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Hourglass, KeyRound, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { ActionMessage, AdminSiteSetting } from '@/types/admin';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { Surface } from '@/components/common/Surface';
import { backendBase } from '@/utils/staticUrl';
import { authHeaders, getErrorMessage } from '@/utils/api';
import { formatMessage } from '@/utils/i18nFormat';

interface AdminSettingsPanelProps {
  onActionMessage: (msg: ActionMessage) => void;
  dict?: Dictionary;
}

const GROUP_ORDER: AdminSiteSetting['group'][] = ['privacy', 'tokens', 'retention'];
const GROUP_ICON: Partial<Record<AdminSiteSetting['group'], LucideIcon>> = {
  privacy: ShieldCheck,
  tokens: KeyRound,
  retention: Hourglass,
};

/** The unit a setting is measured in, from its key suffix (`..._hours`), or null (e.g. an email). */
function unitOf(key: string): 'hours' | 'minutes' | 'days' | null {
  const suffix = key.split('_').pop();
  return suffix === 'hours' || suffix === 'minutes' || suffix === 'days' ? suffix : null;
}

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
  const groupDesc = (group: string) => t[`configGroupDesc_${group}`] || '';
  const dirty = (row: AdminSiteSetting) => (drafts[row.key] ?? '').trim() !== String(row.value);

  return (
    <Surface padding="none" radius="3xl" className="shadow-md backdrop-blur-xl">
      {/* Banner header, same treatment as the profile's drawers */}
      <div className="relative overflow-hidden rounded-t-3xl px-5 py-4 text-center sm:px-7 sm:py-4.5">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20 mix-blend-luminosity dark:opacity-30"
          style={{ backgroundImage: "url('/images/banners/banner_loadouts.webp')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg-surface via-bg-surface/75 to-bg-surface" />
        <div className="relative z-10">
          <h3 className="type-section-title text-text-primary">{t.configTitle || 'Site configuration'}</h3>
          <p className="mx-auto mt-0.5 max-w-2xl type-section-subtitle text-text-secondary">
            {t.configSubtitle || 'Changes apply immediately and are recorded in the audit log.'}
          </p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border-color/60" />
      </div>

      {loading ? (
        <div className="py-12 text-center type-label-sm text-text-muted">…</div>
      ) : (
        <>
          <div className="divide-y divide-border-color">
            {GROUP_ORDER.map((group) => {
              const rows = settings.filter((row) => row.group === group);
              if (rows.length === 0) return null;
              const GroupIcon = GROUP_ICON[group];
              return (
                <section key={group} className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-8">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-red/30 bg-accent-red/15 text-accent-red">
                      {GroupIcon ? <GroupIcon className="h-4 w-4" aria-hidden="true" /> : null}
                    </span>
                    <div className="min-w-0">
                      <h4 className="type-label-sm text-text-primary">{groupLabel(group)}</h4>
                      <p className="mt-1 type-body text-text-muted">{groupDesc(group)}</p>
                    </div>
                  </div>

                  <div className="min-w-0 divide-y divide-border-color rounded-2xl border border-border-color bg-bg-primary/60">
                    {rows.map((row) => {
                      const unit = unitOf(row.key);
                      const changedRow = dirty(row);
                      return (
                        <div
                          key={row.key}
                          className={`grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)] sm:items-start sm:gap-6 ${
                            changedRow ? 'bg-accent-red/5' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <label htmlFor={`cfg-${row.key}`} className="type-strong flex flex-wrap items-center gap-2 text-text-primary">
                              <span>{labelFor(row.key)}</span>
                              {changedRow ? (
                                <span className="type-label-2xs rounded border border-accent-red/30 bg-accent-red/10 px-1.5 py-0.5 text-accent-red">
                                  {t.configModified || 'Modified'}
                                </span>
                              ) : row.overridden ? (
                                <span className="type-label-2xs rounded border border-border-color bg-bg-elevated px-1.5 py-0.5 text-text-muted">
                                  {t.configCustom || 'Custom'}
                                </span>
                              ) : null}
                            </label>
                            <p className="mt-1 type-body text-text-muted">{descFor(row.key)}</p>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <div className="relative">
                              <Input
                                id={`cfg-${row.key}`}
                                type={row.kind === 'email' ? 'email' : 'number'}
                                inputMode={row.kind === 'email' ? 'email' : 'numeric'}
                                min={row.min ?? undefined}
                                max={row.max ?? undefined}
                                fieldSize="sm"
                                className={unit ? 'pr-16' : undefined}
                                value={drafts[row.key] ?? ''}
                                onChange={(e) => setDrafts((prev) => ({ ...prev, [row.key]: e.target.value }))}
                                disabled={saving}
                              />
                              {unit ? (
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 type-caption text-text-muted">
                                  {t[`configUnit_${unit}`] || unit}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 type-caption text-text-muted">
                              <span>
                                {formatMessage((t.configDefaultValue || 'Default: {value}'), { value: String(row.default) || '—' })}
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
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Save bar: stays in view while the form scrolls */}
          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-b-3xl border-t border-border-color bg-bg-surface/95 px-4 py-3 backdrop-blur-md sm:px-6">
            <p
              role="status"
              className={`type-strong ${changed.length > 0 ? 'text-accent-red' : 'text-text-muted'}`}
            >
              {changed.length > 0
                ? `${t.configUnsaved || 'Unsaved changes'} (${changed.length})`
                : t.configAllSaved || 'All saved'}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={saving || changed.length === 0}
                onClick={() => setDrafts(Object.fromEntries(settings.map((row) => [row.key, String(row.value)])))}
              >
                <span>{t.configDiscard || 'Discard'}</span>
              </Button>
              <Button variant="primary" size="sm" loading={saving} disabled={changed.length === 0} onClick={handleSave}>
                <span>{t.configSave || 'Save changes'}</span>
              </Button>
            </div>
          </div>
        </>
      )}
    </Surface>
  );
};
