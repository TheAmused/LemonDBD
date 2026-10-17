'use client';
// frontend/src/components/admin/AdminAuditSection.tsx
//
// Every admin action, newest first, filterable by what it was about.
import React, { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import { Pagination } from '@/components/common/Pagination';
import { Surface } from '@/components/common/Surface';
import { Table, TableBody, TableHead, TableRow, Td, Th } from '@/components/common/Table';
import { tip } from '@/components/common/Tooltip';
import { ADMIN_STORAGE, oneOf } from '@/components/admin/adminStorage';
import { DENSE_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/constants/pagination';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useAdminSettingsDict } from '@/hooks/useAdminSettingsDict';
import { usePersistentNumber } from '@/hooks/usePersistentNumber';
import { usePersistentString } from '@/hooks/usePersistentString';
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

export function AdminAuditSection({ refreshKey, notify }: { refreshKey: number; notify: (message: ActionMessage) => void }) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.admin;
  const settingNames = useAdminSettingsDict();
  const [logs, setLogs] = useState<AdminAuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = usePersistentNumber<number>(ADMIN_STORAGE.auditPerPage, DENSE_PAGE_SIZE, PAGE_SIZE_OPTIONS);
  const [category, setCategory] = usePersistentString<Category>(ADMIN_STORAGE.auditCategory, 'all', oneOf(Object.keys(CATEGORIES) as Category[]));
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
        const labels = settingNames as Record<string, string | undefined> | null;
        return Object.keys(d.changes).map((key) => labels?.[`config_${key}`] ?? key).join(', ');
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
        <CustomDropdown<Category>
          ariaLabel={t.auditFilterLabel}
          accent="primary"
          buttonClassName="py-2"
          value={category}
          onChange={(c) => {
            setCategory(c);
            setPage(1);
          }}
          options={(Object.keys(CATEGORIES) as Category[]).map((c) => ({ value: c, label: t[CATEGORY_LABEL_KEYS[c]] }))}
        />
      </div>

      {logs.length === 0 ? (
        <EmptyState variant="inline" icon={ScrollText} title={loading ? t.loadingAuditLog : t.noAuditLogs} />
      ) : (
        <Table wrapperClassName={cn('transition-opacity', loading && 'opacity-60')} wrapperProps={{ 'aria-busy': loading }}>
          <TableHead>
            <tr>
              <Th>{t.thWhen}</Th>
              <Th>{t.thAction}</Th>
              <Th className="hidden sm:table-cell">{t.thTarget}</Th>
              <Th className="hidden md:table-cell">{t.thDetails}</Th>
              <Th>{t.thAdmin}</Th>
            </tr>
          </TableHead>
          <TableBody>
            {logs.map((log) => {
              const detail = detailOf(log);
              return (
                <TableRow key={log.id} className="align-top">
                  <Td className="whitespace-nowrap text-text-secondary">{formatDateTime(log.created_at, locale, { dateStyle: 'medium', timeStyle: 'short' })}</Td>
                  <Td>
                    <span className={cn('type-strong', actionTone(log.action))}>{actionLabel(log.action)}</span>
                    <span className="block text-text-muted sm:hidden">{targetLabel(log)}</span>
                  </Td>
                  <Td className="hidden whitespace-nowrap text-text-secondary sm:table-cell">{targetLabel(log)}</Td>
                  <Td className="hidden max-w-cell-lg truncate text-text-secondary md:table-cell" {...(detail ? tip(detail, undefined, 'status') : {})}>
                    {detail || '–'}
                  </Td>
                  <Td className="whitespace-nowrap type-strong">{log.admin_username || `#${log.admin_user_id ?? '?'}`}</Td>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {total > 0 && (
        <Pagination
          variant="embedded"
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
