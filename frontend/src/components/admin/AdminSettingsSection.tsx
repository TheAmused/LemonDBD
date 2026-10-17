'use client';
// frontend/src/components/admin/AdminSettingsSection.tsx
//
// Site settings an admin may change without a deploy: switches (sign-ups, guest bug reports...),
// lifetimes, retention periods and the moderation thresholds. A saved value overrides the
// config/env default; "Use default" removes the override. Every save is audited.
import React, { useCallback, useEffect, useState } from 'react';
import { DoorOpen, Hourglass, KeyRound, Scale, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Input } from '@/components/common/Field';
import { Surface } from '@/components/common/Surface';
import { Switch } from '@/components/common/Switch';
import { FogReportIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import { listSettings, saveSettings } from '@/services/adminApi';
import { getErrorMessage } from '@/utils/api';
import { cn } from '@/utils/cn';
import { formatMessage } from '@/utils/i18nFormat';
import type { ActionMessage, AdminSiteSetting, SiteSettingGroup } from '@/types/admin';

const GROUPS: readonly { group: SiteSettingGroup; Icon: LucideIcon | typeof FogReportIcon }[] = [
  { group: 'access', Icon: DoorOpen },
  { group: 'privacy', Icon: ShieldCheck },
  { group: 'tokens', Icon: KeyRound },
  { group: 'moderation', Icon: Scale },
  { group: 'bug_reports', Icon: FogReportIcon },
  { group: 'retention', Icon: Hourglass },
];

/** The unit a setting is measured in, from its key suffix (`..._hours`), or null (an email, a switch). */
function unitOf(key: string): 'hours' | 'minutes' | 'days' | null {
  const suffix = key.split('_').pop();
  return suffix === 'hours' || suffix === 'minutes' || suffix === 'days' ? suffix : null;
}

const asDraft = (value: AdminSiteSetting['value']) => String(value);

export function AdminSettingsSection({ notify }: { notify: (message: ActionMessage) => void }) {
  const dict = useDictionary();
  const t = dict.admin;
  // Per-setting labels are looked up by key (config_<key>, config_<key>_desc, configGroup_<group>...).
  const text = (key: string) => (t as unknown as Record<string, string | undefined>)[key] ?? '';
  const [settings, setSettings] = useState<AdminSiteSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyServerRows = useCallback((rows: AdminSiteSetting[]) => {
    setSettings(rows);
    setDrafts(Object.fromEntries(rows.map((row) => [row.key, asDraft(row.value)])));
  }, []);

  useEffect(() => {
    listSettings()
      .then((data) => applyServerRows(data.settings ?? []))
      .catch((err: unknown) => notify({ type: 'error', text: getErrorMessage(err, t.configLoadFailed) }))
      .finally(() => setLoading(false));
  }, [applyServerRows, notify, t.configLoadFailed]);

  const send = async (payload: Record<string, string | number | boolean | null>) => {
    setSaving(true);
    try {
      applyServerRows((await saveSettings(payload)).settings ?? []);
      notify({ type: 'success', text: t.configSaved });
    } catch (err: unknown) {
      notify({ type: 'error', text: getErrorMessage(err, t.configSaveFailed) });
    } finally {
      setSaving(false);
    }
  };

  const isDirty = (row: AdminSiteSetting) => (drafts[row.key] ?? '').trim() !== asDraft(row.value);
  const changed = settings.filter(isDirty);
  const setDraft = (key: string, value: string) => setDrafts((prev) => ({ ...prev, [key]: value }));

  if (loading) return <EmptyState variant="inline" title={t.loading} />;

  return (
    <Surface padding="none">
      <p className="border-b border-border-color px-4 py-3 type-body text-text-muted sm:px-6">{t.configSubtitle}</p>

      <div className="divide-y divide-border-color">
        {GROUPS.map(({ group, Icon }) => {
          const rows = settings.filter((row) => row.group === group);
          if (rows.length === 0) return null;
          return (
            <section key={group} aria-labelledby={`cfg-group-${group}`} className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-8">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-border-color bg-bg-elevated text-text-secondary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 id={`cfg-group-${group}`} className="type-label-sm text-text-primary">{text(`configGroup_${group}`)}</h2>
                  <p className="mt-1 type-body text-text-muted">{text(`configGroupDesc_${group}`)}</p>
                </div>
              </div>

              <div className="min-w-0 divide-y divide-border-color rounded-card border border-border-color bg-bg-primary/60">
                {rows.map((row) => {
                  const dirty = isDirty(row);
                  const unit = unitOf(row.key);
                  const draft = drafts[row.key] ?? '';
                  return (
                    <div
                      key={row.key}
                      className={cn('grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)] sm:items-start sm:gap-6', dirty && 'bg-accent-amber/5')}
                    >
                      <div className="min-w-0">
                        <label htmlFor={row.kind === 'bool' ? undefined : `cfg-${row.key}`} className="flex flex-wrap items-center gap-2 type-strong text-text-primary">
                          <span>{text(`config_${row.key}`) || row.key}</span>
                          {dirty ? (
                            <Badge tone="amber" size="xs" square>{t.configModified}</Badge>
                          ) : row.overridden ? (
                            <Badge tone="neutral" size="xs" square>{t.configCustom}</Badge>
                          ) : null}
                        </label>
                        <p className="mt-1 type-body text-text-muted">{text(`config_${row.key}_desc`)}</p>
                      </div>

                      <div className="flex flex-col gap-1.5 sm:items-end">
                        {row.kind === 'bool' ? (
                          <span className="inline-flex items-center gap-2.5">
                            <span className="type-strong-xs text-text-secondary">{draft === 'true' ? t.configOn : t.configOff}</span>
                            <Switch
                              checked={draft === 'true'}
                              onChange={(on) => setDraft(row.key, String(on))}
                              ariaLabel={text(`config_${row.key}`) || row.key}
                            />
                          </span>
                        ) : (
                          <div className="relative w-full">
                            <Input
                              id={`cfg-${row.key}`}
                              type={row.kind === 'email' ? 'email' : 'number'}
                              inputMode={row.kind === 'email' ? 'email' : 'numeric'}
                              min={row.min ?? undefined}
                              max={row.max ?? undefined}
                              fieldSize="sm"
                              className={unit ? 'pr-16' : undefined}
                              value={draft}
                              onChange={(e) => setDraft(row.key, e.target.value)}
                              disabled={saving}
                            />
                            {unit && (
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 type-caption text-text-muted">
                                {text(`configUnit_${unit}`)}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 type-caption text-text-muted">
                          <span>
                            {formatMessage(t.configDefaultValue, {
                              value: row.kind === 'bool' ? (row.default ? t.configOn : t.configOff) : String(row.default) || '–',
                            })}
                          </span>
                          {row.overridden && (
                            <Button type="button" disabled={saving} onClick={() => send({ [row.key]: null })} variant="linkDanger" size="sm">
                              {t.configResetDefault}
                            </Button>
                          )}
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
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-b-card border-t border-border-color bg-bg-surface/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <p role="status" className={cn('type-strong', changed.length > 0 ? 'text-accent-amber' : 'text-text-muted')}>
          {changed.length > 0 ? formatMessage(t.configUnsaved, { count: changed.length }) : t.configAllSaved}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={saving || changed.length === 0}
            onClick={() => setDrafts(Object.fromEntries(settings.map((row) => [row.key, asDraft(row.value)])))}
          >
            {t.configDiscard}
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            disabled={changed.length === 0}
            onClick={() => send(Object.fromEntries(changed.map((row) => [row.key, (drafts[row.key] ?? '').trim()])))}
          >
            {t.configSave}
          </Button>
        </div>
      </div>
    </Surface>
  );
}
