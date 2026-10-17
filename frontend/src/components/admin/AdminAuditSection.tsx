'use client';
// frontend/src/components/admin/AdminAuditSection.tsx
//
// Every admin action, newest first, filterable by what it was about.
import React, { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { Select } from '@/components/common/Field';
import { Pagination } from '@/components/common/Pagination';
import { Surface } from '@/components/common/Surface';
import { tip } from '@/components/common/Tooltip';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { listAuditLogs } from '@/services/adminApi';
import { getErrorMessage } from '@/utils/api';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';
import type { ActionMessage, AdminAuditLogEntry } from '@/types/admin';

/** The filter's categories and the target types each one covers (as the backend records them). */
const CATEGORIES = {
  all: [],
  users: ['user'],
  reports: ['bug_report', 'content'],
  availability: ['challenge_mode', 'character', 'perk'],
  publishing: ['tier_list', 'roster', 'changelog_post'],
  system: ['site_settings', 'maintenance'],
} as const satisfies Record<string, readonly string[]>;
type Category = keyof typeof CATEGORIES;

const CATEGORY_LABEL_KEYS = {
  all: 'auditCategoryAll',
  users: 'auditCategoryUsers',
  reports: 'auditCategoryReports',
  availability: 'auditCategoryAvailability',
  publishing: 'auditCategoryPublishing',
  system: 'auditCategorySystem',
} as const satisfies Record<Category, string>;

/** Readable names for the actions the backend records; an action not listed here is shown as stored. */
const ACTION_LABEL_KEYS = {
  bug_report_deleted: 'auditActionBugReportDeleted',
  bug_report_updated: 'auditActionBugReportUpdated',
  challenge_mode_disabled: 'auditActionChallengeModeDisabled',
  challenge_mode_enabled: 'auditActionChallengeModeEnabled',
  character_disabled: 'auditActionCharacterDisabled',
  character_enabled: 'auditActionCharacterEnabled',
  content_ban: 'auditActionContentBan',
  content_dismiss: 'auditActionContentDismiss',
  perk_disabled: 'auditActionPerkDisabled',
  perk_enabled: 'auditActionPerkEnabled',
  site_settings_updated: 'auditActionSiteSettingsUpdated',
  maintenance_run: 'auditActionMaintenanceRun',
  user_data_exported: 'auditActionUserDataExported',
  user_warned: 'auditActionUserWarned',
  user_suspended: 'auditActionUserSuspended',
  user_banned: 'auditActionUserBanned',
  sanction_revoked: 'auditActionSanctionRevoked',
  account_restored: 'auditActionAccountRestored',
  user_deleted: 'auditActionUserDeleted',
  user_two_factor_reset: 'auditActionUserTwoFactorReset',
  user_updated: 'auditActionUserUpdated',
  'tier_list.create': 'auditActionTierListCreated',
  'tier_list.update': 'auditActionTierListUpdated',
  'smash_roster.create': 'auditActionRosterCreated',
  'changelog.create': 'auditActionChangelogCreated',
  'changelog.update': 'auditActionChangelogUpdated',
  'changelog.reorder': 'auditActionChangelogReordered',
  'changelog.delete': 'auditActionChangelogDeleted',
} as const;

const TARGET_LABEL_KEYS = {
  user: 'auditTargetUser',
  bug_report: 'auditTargetBugReport',
  content: 'auditTargetContent',
  challenge_mode: 'auditTargetChallengeMode',
  character: 'auditTargetCharacter',
  perk: 'auditTargetPerk',
  tier_list: 'auditTargetTierList',
  roster: 'auditTargetRoster',
  changelog_post: 'auditTargetChangelog',
  site_settings: 'auditTargetSettings',
  maintenance: 'auditTargetMaintenance',
} as const;

/** Removing access or content reads red, giving it back green, everything else neutral. */
const actionTone = (action: string): string =>
  /(disabled|deleted|ban|banned|suspended)$/.test(action)
    ? 'text-accent-red'
    : /(enabled|restored|revoked|dismiss)$/.test(action)
      ? 'text-accent-green'
      : action === 'user_warned'
        ? 'text-accent-amber'
        : 'text-text-primary';

const PAGE_SIZE = 30;

export function AdminAuditSection({ refreshKey, notify }: { refreshKey: number; notify: (message: ActionMessage) => void }) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.admin;
  const [logs, setLogs] = useState<AdminAuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PAGE_SIZE);
  const [category, setCategory] = useState<Category>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAuditLogs({ page, per_page: perPage, target_type: CATEGORIES[category].join(',') })
      .then((data) => {
        if (cancelled) return;
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((err: unknown) => !cancelled && notify({ type: 'error', text: getErrorMessage(err, t.networkError) }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, perPage, category, refreshKey, notify, t.networkError]);

  const actionLabel = (action: string) => {
    const key = ACTION_LABEL_KEYS[action as keyof typeof ACTION_LABEL_KEYS];
    return key ? t[key] : action;
  };
  const targetLabel = (log: AdminAuditLogEntry) => {
    if (!log.target_type) return '–';
    const key = TARGET_LABEL_KEYS[log.target_type as keyof typeof TARGET_LABEL_KEYS];
    const name = key ? t[key] : log.target_type;
    return log.target_id ? `${name} #${log.target_id}` : name;
  };
  /** The one line worth reading from the stored details: a reason, a note, a name or the changed settings. */
  const detailOf = (log: AdminAuditLogEntry): string => {
    if (!log.details) return '';
    try {
      const d = JSON.parse(log.details) as Record<string, unknown>;
      const text = [d.reason, d.admin_notes, d.name, d.title, d.username].find((v) => typeof v === 'string' && v);
      if (typeof text === 'string') return text;
      if (d.changes && typeof d.changes === 'object') {
        // Setting keys read as their Settings label (config_<key>), so the line is not code.
        const labels = t as unknown as Record<string, string | undefined>;
        return Object.keys(d.changes).map((key) => labels[`config_${key}`] ?? key).join(', ');
      }
      if (typeof d.status === 'string') return d.status;
      return '';
    } catch {
      return '';
    }
  };

  return (
    <Surface padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border-color p-3 sm:p-4">
        <Select
          fieldSize="sm"
          className="w-auto"
          aria-label={t.auditFilterLabel}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as Category);
            setPage(1);
          }}
        >
          {(Object.keys(CATEGORIES) as Category[]).map((c) => (
            <option key={c} value={c}>
              {t[CATEGORY_LABEL_KEYS[c]]}
            </option>
          ))}
        </Select>
      </div>

      {logs.length === 0 ? (
        <EmptyState variant="inline" icon={ScrollText} title={loading ? t.loadingAuditLog : t.noAuditLogs} />
      ) : (
        <div className={cn('overflow-x-auto transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border-color bg-bg-elevated/60 type-label-2xs text-text-secondary">
              <tr>
                <th scope="col" className="px-4 py-2.5">{t.thWhen}</th>
                <th scope="col" className="px-4 py-2.5">{t.thAction}</th>
                <th scope="col" className="hidden px-4 py-2.5 sm:table-cell">{t.thTarget}</th>
                <th scope="col" className="hidden px-4 py-2.5 md:table-cell">{t.thDetails}</th>
                <th scope="col" className="px-4 py-2.5">{t.thAdmin}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-text-primary">
              {logs.map((log) => {
                const detail = detailOf(log);
                return (
                  <tr key={log.id} className="align-top transition-colors hover:bg-bg-elevated/40">
                    <td className="whitespace-nowrap px-4 py-2.5 text-text-secondary">{formatDateTime(log.created_at, locale, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('font-semibold', actionTone(log.action))}>{actionLabel(log.action)}</span>
                      <span className="block text-text-muted sm:hidden">{targetLabel(log)}</span>
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-2.5 text-text-secondary sm:table-cell">{targetLabel(log)}</td>
                    <td className="hidden max-w-[22rem] truncate px-4 py-2.5 text-text-secondary md:table-cell" {...(detail ? tip(detail, undefined, 'status') : {})}>
                      {detail || '–'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-semibold">{log.admin_username || `#${log.admin_user_id ?? '?'}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <Pagination
          className="mt-0 border-t border-border-color px-3 py-2.5 sm:mt-0 sm:px-4 sm:pt-2.5 lg:pt-2.5 wide:pt-2.5"
          page={page}
          totalPages={Math.ceil(total / perPage)}
          totalResults={total}
          limit={perPage}
          onPageChange={setPage}
          onLimitChange={(n) => {
            setPerPage(n);
            setPage(1);
          }}
        />
      )}
    </Surface>
  );
}
