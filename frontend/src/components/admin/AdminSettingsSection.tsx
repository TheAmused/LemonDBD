'use client';
// frontend/src/components/admin/AdminSettingsSection.tsx
//
// Site settings an admin may change without a rebuild or a deploy: the notice banner, outbound links,
// sign-up and security switches, abuse limits, lifetimes, retention periods, integrations (write-only
// secrets) and the moderation thresholds. A saved value overrides the config/env default; putting a field
// back to its default (one field, or all of them) and saving removes the override. Every save is audited;
// a change that lowers a protection also needs a confirmation and a reason. The server validates and bounds every value again.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DoorOpen, Gauge, Hourglass, KeyRound, Link2, Megaphone, Plug, RotateCcw, Scale, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { EmptyState } from '@/components/common/EmptyState';
import { FieldLabel, Input, Select } from '@/components/common/Field';
import { Switch } from '@/components/common/Switch';
import { FogReportIcon } from '@/components/icons/DbdIcons';
import { LocalizedTextControl } from '@/components/admin/LocalizedTextControl';
import { SettingGroupDrawer } from '@/components/admin/SettingGroupDrawer';
import {
  LOCKED_SETTING_KEYS,
  SETTING_GROUP_ORDER,
  TRANSLATED_TEXT_KEYS,
  defaultDraftOf,
  draftOf,
  draftProblem,
  isDraftDefault,
  isDraftDirty,
  isRiskyDraft,
  isoToLocalInput,
  localInputToIso,
  payloadValue,
  unitOf,
  type DraftProblem,
} from '@/components/admin/settingsForm';
import { AdminTabContentSkeleton } from '@/components/admin/AdminTabContentSkeleton';
import { useDictionary } from '@/context/DictionaryContext';
import { useAdminSettingsDict } from '@/hooks/useAdminSettingsDict';
import type { AdminSettingsDict } from '@/locales/adminSettings';
import { listSettings, saveSettings } from '@/services/adminApi';
import { getErrorMessage } from '@/utils/api';
import { cn } from '@/utils/cn';
import { formatMessage } from '@/utils/i18nFormat';
import type { ActionMessage, AdminSiteSetting, SiteSettingGroup } from '@/types/admin';

const GROUP_ICONS: Record<SiteSettingGroup, LucideIcon | typeof FogReportIcon> = {
  notices: Megaphone,
  access: DoorOpen,
  links: Link2,
  limits: Gauge,
  tokens: KeyRound,
  integrations: Plug,
  moderation: Scale,
  bug_reports: FogReportIcon,
  retention: Hourglass,
  privacy: ShieldCheck,
};

const MIN_REASON_LENGTH = 5;
const REASON_MAX_LENGTH = 300;

interface SettingsSectionProps {
  notify: (message: ActionMessage) => void;
  refreshKey?: number;
  /** How many fields hold unsaved changes, so the panel can ask before the tab is left. */
  onDirtyChange?: (count: number) => void;
}

/** Loads the tab's own dictionary (admins only, see locales/adminSettings.ts), then shows the panel. */
export function AdminSettingsSection({ notify, refreshKey = 0, onDirtyChange }: SettingsSectionProps) {
  const t = useAdminSettingsDict();
  return t ? <SettingsPanel notify={notify} t={t} refreshKey={refreshKey} onDirtyChange={onDirtyChange} /> : <AdminTabContentSkeleton />;
}

function SettingsPanel({ notify, t, refreshKey, onDirtyChange }: Omit<SettingsSectionProps, 'refreshKey'> & { t: AdminSettingsDict; refreshKey: number }) {
  const dict = useDictionary();
  // Per-setting labels are looked up by key (config_<key>, config_<key>_desc, configGroup_<group>...).
  const text = (key: string) => (t as Record<string, string | undefined>)[key] ?? '';
  const [settings, setSettings] = useState<AdminSiteSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');

  const settingsRef = useRef<AdminSiteSetting[]>([]);
  /**
   * Show the server's values. `keepDirty` keeps every field the admin has changed but not saved
   * (except `savedKey`, the secret just removed): the header's Refresh used to remount this tab, and
   * removing one secret used to reload them all, both silently throwing those edits away.
   */
  const applyServerRows = useCallback((rows: AdminSiteSetting[], keepDirty = false, savedKey?: string) => {
    const previous = new Map(settingsRef.current.map((row) => [row.key, row]));
    settingsRef.current = rows;
    setSettings(rows);
    setDrafts((prevDrafts) =>
      Object.fromEntries(
        rows.map((row) => {
          const old = previous.get(row.key);
          const draft = prevDrafts[row.key];
          const keep = keepDirty && row.key !== savedKey && old !== undefined && draft !== undefined && isDraftDirty(old, draft);
          return [row.key, keep ? draft : draftOf(row)];
        })
      )
    );
  }, []);

  useEffect(() => {
    listSettings()
      .then((data) => applyServerRows(data.settings ?? [], true))
      .catch((err: unknown) => notify({ type: 'error', text: getErrorMessage(err, t.configLoadFailed) }))
      .finally(() => setLoading(false));
  }, [applyServerRows, notify, t.configLoadFailed, refreshKey]);

  const send = async (
    payload: Record<string, string | number | boolean | null>,
    options?: { confirmRisky: boolean; reason: string },
    /** Removing one secret: every other unsaved field stays as typed. */
    resetKey?: string
  ) => {
    setSaving(true);
    try {
      applyServerRows((await saveSettings(payload, options)).settings ?? [], resetKey !== undefined, resetKey);
      notify({ type: 'success', text: t.configSaved });
      setConfirmOpen(false);
      setReason('');
    } catch (err: unknown) {
      notify({ type: 'error', text: getErrorMessage(err, t.configSaveFailed) });
    } finally {
      setSaving(false);
    }
  };

  const draftFor = (row: AdminSiteSetting) => drafts[row.key] ?? '';
  const changed = settings.filter((row) => isDraftDirty(row, draftFor(row)));
  const problems = changed.filter((row) => draftProblem(row, draftFor(row)) !== null);
  const risky = changed.filter((row) => isRiskyDraft(row, draftFor(row)));
  const payload = () => Object.fromEntries(changed.map((row) => [row.key, payloadValue(row, draftFor(row))]));
  const setDraft = (key: string, value: string) => setDrafts((prev) => ({ ...prev, [key]: value }));
  /** Every field with a default goes back to it, unsaved; secrets have none and stay as they are. */
  const resetAll = () =>
    setDrafts((prev) => ({
      ...prev,
      ...Object.fromEntries(
        settings.flatMap((row) => {
          const base = defaultDraftOf(row);
          return base === null || LOCKED_SETTING_KEYS.includes(row.key) ? [] : [[row.key, base]];
        })
      ),
    }));
  const allAtDefault = settings.every((row) => defaultDraftOf(row) === null || LOCKED_SETTING_KEYS.includes(row.key) || isDraftDefault(row, draftFor(row)));
  const reasonOk = reason.trim().length >= MIN_REASON_LENGTH;

  // The panel asks before its tab is left (AdminPanelClient), the browser before the page is.
  useEffect(() => {
    onDirtyChange?.(changed.length);
  }, [changed.length, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(0), [onDirtyChange]);
  useEffect(() => {
    if (changed.length === 0) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changed.length]);

  const problemText = (row: AdminSiteSetting, problem: DraftProblem): string => {
    if (problem === 'number') return t.configInvalidNumber;
    if (problem === 'range') return formatMessage(t.configInvalidRange, { min: row.min ?? 0, max: row.max ?? 0 });
    if (problem === 'link') return t.configInvalidLink;
    if (problem === 'length') return formatMessage(t.configInvalidLength, { max: row.max_length });
    return '';
  };

  if (loading) return <EmptyState variant="inline" title={dict.admin.loading} />;

  const renderControl = (row: AdminSiteSetting, problem: DraftProblem | null) => {
    const draft = draftFor(row);
    const label = text(`config_${row.key}`) || row.key;
    const invalid = problem !== null;
    /** Saving, or a setting nothing uses at the moment (see LOCKED_SETTING_KEYS). */
    const frozen = saving || LOCKED_SETTING_KEYS.includes(row.key);

    if (TRANSLATED_TEXT_KEYS.includes(row.key)) {
      return (
        <LocalizedTextControl
          baseKey={row.key}
          maxLength={row.max_length}
          ariaLabel={label}
          valueOf={(key) => drafts[key] ?? ''}
          onChange={setDraft}
          disabled={frozen}
        />
      );
    }

    switch (row.kind) {
      case 'bool':
        return (
          <span className="inline-flex items-center gap-2.5">
            <span className="type-strong-xs text-text-secondary">{draft === 'true' ? t.configOn : t.configOff}</span>
            <Switch checked={draft === 'true'} onChange={(on) => setDraft(row.key, String(on))} ariaLabel={label} disabled={frozen} />
          </span>
        );
      case 'choice':
        return (
          <Select
            id={`cfg-${row.key}`}
            fieldSize="sm"
            value={draft}
            onChange={(e) => setDraft(row.key, e.target.value)}
            disabled={frozen}
          >
            {row.choices.map((choice) => (
              <option key={choice} value={choice}>
                {text(`configChoice_${choice}`) || choice}
              </option>
            ))}
          </Select>
        );
      case 'datetime':
        return (
          <div className="flex w-full flex-col gap-1.5 sm:items-end">
            <Input
              id={`cfg-${row.key}`}
              type="datetime-local"
              fieldSize="sm"
              value={isoToLocalInput(draft)}
              onChange={(e) => setDraft(row.key, localInputToIso(e.target.value))}
              disabled={frozen}
            />
            {draft && (
              <Button type="button" variant="linkMuted" size="sm" disabled={frozen} onClick={() => setDraft(row.key, '')}>
                {t.configClearTime}
              </Button>
            )}
          </div>
        );
      case 'secret': {
        const status = row.overridden ? t.configSecretSet : row.env_set ? t.configSecretServer : t.configSecretNone;
        return (
          <div className="flex w-full flex-col gap-1.5">
            <Badge tone={row.overridden ? 'green' : 'neutral'} size="xs" square className="self-start sm:self-end">
              {status}
            </Badge>
            <Input
              id={`cfg-${row.key}`}
              type="password"
              fieldSize="sm"
              autoComplete="new-password"
              spellCheck={false}
              maxLength={row.max_length}
              placeholder={t.configSecretPlaceholder}
              value={draft}
              invalid={invalid}
              onChange={(e) => setDraft(row.key, e.target.value)}
              disabled={frozen}
            />
          </div>
        );
      }
      case 'text':
      case 'url':
      case 'email':
        return (
          <div className="flex w-full flex-col gap-1">
            <Input
              id={`cfg-${row.key}`}
              type={row.kind === 'email' ? 'email' : row.kind === 'url' ? 'url' : 'text'}
              inputMode={row.kind === 'email' ? 'email' : row.kind === 'url' ? 'url' : 'text'}
              fieldSize="sm"
              maxLength={row.kind === 'email' ? undefined : row.max_length}
              placeholder={defaultDraftOf(row) || (row.kind === 'url' ? t.configLinkPlaceholder : undefined)}
              spellCheck={row.kind === 'text'}
              value={draft}
              invalid={invalid}
              onChange={(e) => setDraft(row.key, e.target.value)}
              disabled={frozen}
            />
            {row.kind === 'text' && (
              <span className="type-caption text-text-muted sm:text-right">
                {draft.trim().length}/{row.max_length}
              </span>
            )}
          </div>
        );
      default: {
        const unit = unitOf(row.key);
        return (
          <div className="relative ml-auto w-28">
            <Input
              id={`cfg-${row.key}`}
              type="number"
              inputMode="numeric"
              min={row.min ?? undefined}
              max={row.max ?? undefined}
              fieldSize="sm"
              className={cn('no-spinner', unit && 'pr-11')}
              value={draft}
              invalid={invalid}
              onChange={(e) => setDraft(row.key, e.target.value)}
              disabled={frozen}
            />
            {unit && (
              <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 type-caption text-text-muted">
                {text(`configUnit_${unit}`)}
              </span>
            )}
          </div>
        );
      }
    }
  };

  const defaultLabel = (row: AdminSiteSetting): string => {
    if (row.kind === 'secret') return row.env_set ? t.configSecretServer : t.configSecretNone;
    if (row.kind === 'bool') return row.default ? t.configOn : t.configOff;
    if (row.kind === 'choice') return text(`configChoice_${String(row.default)}`) || String(row.default);
    const value = String(row.default ?? '') || '–';
    const unit = row.kind === 'int' ? unitOf(row.key) : null;
    if (!unit || row.default === null) return value;
    return unit === 'perMinute' ? `${value}${text('configUnit_perMinute')}` : `${value} ${text(`configUnit_${unit}`)}`;
  };

  // The banner as visitors would see it, from what is typed right now.
  const bannerRow = settings.find((row) => row.key === 'site_banner_text');
  const bannerLevelRow = settings.find((row) => row.key === 'site_banner_level');
  const bannerText = bannerRow ? draftFor(bannerRow).trim() : '';

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {SETTING_GROUP_ORDER.map((group) => {
          const rows = settings.filter((row) => row.group === group);
          if (rows.length === 0) return null;
          const GroupIcon = GROUP_ICONS[group];
          return (
            <SettingGroupDrawer
              key={group}
              group={group}
              icon={<GroupIcon className="icon-sm text-text-muted" aria-hidden="true" />}
              resetIcon={<RotateCcw aria-hidden="true" />}
              rows={rows}
              t={t}
              text={text}
              renderControl={renderControl}
              draftFor={draftFor}
              isDraftDirty={isDraftDirty}
              draftProblem={draftProblem}
              problemText={problemText}
              defaultLabel={defaultLabel}
              send={send}
              onResetDefault={(row) => setDraft(row.key, defaultDraftOf(row) ?? '')}
              saving={saving}
              bannerText={group === 'notices' ? bannerText : undefined}
              bannerLevelRow={group === 'notices' ? bannerLevelRow : undefined}
            />
          );
        })}
      </div>

      {/* Save bar: stays in view while the form scrolls */}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-color bg-bg-surface/95 px-4 py-3 shadow-lg backdrop-blur-md sm:px-6">
        <output className={cn('block type-strong', changed.length > 0 ? 'text-accent-amber' : 'text-text-muted')}>
          {changed.length > 0 ? formatMessage(t.configUnsaved, { count: changed.length }) : t.configAllSaved}
        </output>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={saving || allAtDefault}
            onClick={resetAll}
            leftIcon={<RotateCcw aria-hidden="true" />}
          >
            {t.configResetAll}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={saving || changed.length === 0}
            onClick={() => setDrafts(Object.fromEntries(settings.map((row) => [row.key, draftOf(row)])))}
          >
            {t.configDiscard}
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            disabled={changed.length === 0 || problems.length > 0}
            onClick={() => { void (risky.length > 0 ? setConfirmOpen(true) : send(payload())); }}
          >
            {t.configSave}
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        size="md"
        title={t.configRiskTitle}
        message={
          <div className="space-y-3 text-left">
            <p>{t.configRiskBody}</p>
            <ul className="list-disc space-y-1 pl-5 type-strong text-text-primary">
              {risky.map((row) => (
                <li key={row.key}>{text(`config_${row.key}`) || row.key}</li>
              ))}
            </ul>
            <div>
              <FieldLabel htmlFor="cfg-risk-reason">{t.configRiskReason}</FieldLabel>
              <Input
                id="cfg-risk-reason"
                fieldSize="sm"
                maxLength={REASON_MAX_LENGTH}
                value={reason}
                placeholder={t.configRiskReasonPlaceholder}
                onChange={(e) => setReason(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
        }
        confirmLabel={t.configRiskConfirm}
        alternativeLabel={t.configDiscard}
        busyLabel={t.configRiskConfirm}
        busy={saving}
        confirmDisabled={!reasonOk}
        onConfirm={() => { void send(payload(), { confirmRisky: true, reason: reason.trim() }); }}
        onCancel={() => {
          setConfirmOpen(false);
          setReason('');
        }}
      />
    </div>
  );
}
