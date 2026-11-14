'use client';
// frontend/src/components/admin/SettingGroupDrawer.tsx
//
// One group of the Settings tab as a fold-away section: its rows (label, description, control, the button
// that puts a field back to its default, the default itself) around controls the tab renders.
import React from 'react';
import { AccordionSection } from '@/components/common/AccordionSection';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { FieldLabel } from '@/components/common/Field';
import { Surface } from '@/components/common/Surface';
import { tip } from '@/components/common/Tooltip';
import { SiteBannerView } from '@/components/layout/SiteBanner';
import {
  LOCKED_SETTING_KEYS,
  TRANSLATED_TEXT_KEYS,
  defaultDraftOf,
  draftOf,
  isDraftDefault,
  isTranslationKey,
  translationKeys,
  type DraftProblem,
} from '@/components/admin/settingsForm';
import { adminSettingDrawerKey } from '@/components/admin/adminStorage';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import type { AdminSettingsDict } from '@/locales/adminSettings';
import { cn } from '@/utils/cn';
import { formatMessage } from '@/utils/i18nFormat';
import type { BannerLevel } from '@/types/siteConfig';
import type { AdminSiteSetting, SiteSettingGroup } from '@/types/admin';

const BANNER_LEVEL_VALUES: readonly BannerLevel[] = ['info', 'warning', 'critical'];

const asBannerLevel = (value: string): BannerLevel => BANNER_LEVEL_VALUES.find((level) => level === value) ?? 'info';

export interface SettingGroupDrawerProps {
  group: SiteSettingGroup;
  /** The group's icon and the reset button's icon, drawn by the caller (icons are imported in one place). */
  icon: React.ReactNode;
  resetIcon: React.ReactNode;
  rows: AdminSiteSetting[];
  t: AdminSettingsDict;
  text: (key: string) => string;
  renderControl: (row: AdminSiteSetting, problem: DraftProblem | null) => React.ReactNode;
  draftFor: (row: AdminSiteSetting) => string;
  isDraftDirty: (row: AdminSiteSetting, draft: string) => boolean;
  draftProblem: (row: AdminSiteSetting, draft: string) => DraftProblem | null;
  problemText: (row: AdminSiteSetting, problem: DraftProblem) => string;
  defaultLabel: (row: AdminSiteSetting) => string;
  send: (
    payload: Record<string, string | number | boolean | null>,
    options?: { confirmRisky: boolean; reason: string },
    resetKey?: string
  ) => Promise<void>;
  /** Puts one field back to its default (unsaved until the save bar's Save). */
  onResetDefault: (row: AdminSiteSetting) => void;
  saving: boolean;
  bannerText?: string;
  bannerLevelRow?: AdminSiteSetting;
}

export function SettingGroupDrawer({
  group,
  icon,
  resetIcon,
  rows,
  t,
  text,
  renderControl,
  draftFor,
  isDraftDirty,
  draftProblem,
  problemText,
  defaultLabel,
  send,
  onResetDefault,
  saving,
  bannerText,
  bannerLevelRow,
}: SettingGroupDrawerProps) {
  const [open, toggle] = usePersistentDrawer(adminSettingDrawerKey(group), true);
  const dirtyCount = rows.filter((row) => isDraftDirty(row, draftFor(row))).length;

  return (
    <AccordionSection
      as="section"
      title={
        <span className="inline-flex items-center gap-2.5">
          {icon}
          <span>{text(`configGroup_${group}`)}</span>
        </span>
      }
      open={open}
      onToggle={toggle}
      headerAction={
        dirtyCount > 0 ? (
          <Badge tone="amber" size="xs">
            {formatMessage(t.configUnsaved, { count: dirtyCount })}
          </Badge>
        ) : null
      }
      className="rounded-card border border-border-color bg-bg-surface"
      bodyClassName="p-0"
    >
      <p className="border-b border-border-color p-3 text-center type-caption text-text-muted sm:px-5">
        {text(`configGroupDesc_${group}`)}
      </p>

      {group === 'notices' && bannerText && bannerLevelRow && (
        <div className="border-b border-border-color p-4 sm:p-6">
          <FieldLabel as="span">{t.configBannerPreview}</FieldLabel>
          <Surface tone="well" padding="none" className="overflow-hidden">
            <SiteBannerView level={asBannerLevel(draftFor(bannerLevelRow))} text={bannerText} />
          </Surface>
        </div>
      )}

      <div className="min-w-0 divide-y divide-border-color">
        {rows.filter((row) => !isTranslationKey(row.key)).map((row) => {
          // A translated text is one row: its other languages are edited inside the same field.
          const translated = TRANSLATED_TEXT_KEYS.includes(row.key);
          const related = [row, ...rows.filter((other) => translationKeys(row.key).includes(other.key))];
          const dirty = related.some((other) => isDraftDirty(other, draftFor(other)));
          const problem = related.map((other) => (isDraftDirty(other, draftFor(other)) ? draftProblem(other, draftFor(other)) : null)).find((found) => found !== null) ?? null;
          const label = text(`config_${row.key}`) || row.key;
          const showRemove = row.kind === 'secret' && row.overridden;
          const locked = LOCKED_SETTING_KEYS.includes(row.key);
          // Under the field, always: a typed field has its default as the placeholder instead, and an empty default says nothing.
          const showDefault = !['text', 'url', 'email', 'secret'].includes(row.kind) && Boolean(defaultDraftOf(row));
          return (
            <div
              key={row.key}
              className={cn('grid gap-3 p-4 sm:grid-cols-label-control sm:items-start sm:gap-6', dirty && 'bg-accent-amber/5', locked && 'opacity-50')}
            >
              <div className="min-w-0">
                <label htmlFor={row.kind === 'bool' ? undefined : `cfg-${row.key}`} className="flex flex-wrap items-center gap-2 type-strong text-text-primary">
                  <span>{label}</span>
                  {dirty ? (
                    <Badge tone="amber" size="xs" square>{t.configModified}</Badge>
                  ) : related.some((other) => other.kind !== 'secret' && !isDraftDefault(other, draftOf(other))) ? (
                    <Badge tone="neutral" size="xs" square>{t.configCustom}</Badge>
                  ) : null}
                  {row.risky_when !== null && (
                    <Badge tone="red" size="xs" square>{t.configSecuritySwitch}</Badge>
                  )}
                </label>
                <p className="mt-1 type-body text-text-muted">{text(`config_${row.key}_desc`)}</p>
              </div>

              <div className="flex flex-col gap-1.5 sm:items-end">
                {row.kind === 'bool' || row.kind === 'secret' || translated || locked ? (
                  renderControl(row, problem)
                ) : (
                  <div className="flex w-full items-start gap-2">
                    {/* Always takes its place, so the field does not change width when the button appears. */}
                    <Button
                      icon
                      size="xs"
                      variant="ghost"
                      disabled={saving}
                      onClick={() => onResetDefault(row)}
                      aria-label={t.configResetDefault}
                      aria-hidden={isDraftDefault(row, draftFor(row)) || undefined}
                      tabIndex={isDraftDefault(row, draftFor(row)) ? -1 : undefined}
                      className={cn('mt-0.5', isDraftDefault(row, draftFor(row)) && 'invisible')}
                      {...tip(t.configResetDefault, undefined, 'action')}
                    >
                      {resetIcon}
                    </Button>
                    <div className="min-w-0 flex-1">{renderControl(row, problem)}</div>
                  </div>
                )}
                {problem && (
                  <p role="alert" className="type-caption font-medium text-accent-red">{problemText(row, problem)}</p>
                )}
                {showDefault && (
                  <span className="type-caption text-text-muted">{formatMessage(t.configDefaultValue, { value: defaultLabel(row) })}</span>
                )}
                {showRemove && (
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={() => { void send({ [row.key]: null }, undefined, row.key); }}
                    variant="linkDanger"
                    size="sm"
                  >
                    {t.configSecretRemove}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AccordionSection>
  );
}
