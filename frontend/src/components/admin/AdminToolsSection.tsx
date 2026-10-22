'use client';
// frontend/src/components/admin/AdminToolsSection.tsx
//
// The operator's corner: the live state of every dependency, run-now housekeeping, database backup
// and restore, and the tests that prove a feature works end to end (OCR, email, Discord).
import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Database, Download, ExternalLink, LineChart, Mail, MessageSquare, Play, RefreshCw, ScanText, Trash2, Upload } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/common/Badge';
import { Button, buttonClassName } from '@/components/common/Button';
import { AccordionSection } from '@/components/common/AccordionSection';
import { analyticsUrl, pgAdminUrl } from '@/components/admin/adminLinks';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { adminToolDrawerKey } from '@/components/admin/adminStorage';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import { cn } from '@/utils/cn';
import {
  fetchSystemChecks,
  listMaintenanceJobs,
  runMaintenanceJob,
  sendTestDiscord,
  sendTestEmail,
} from '@/services/adminApi';
import { getErrorMessage } from '@/utils/api';
import { formatMessage } from '@/utils/i18nFormat';
import type { ScraperTab } from '@/components/scraper-config/scraperTargets';
import { formatDateTime } from '@/utils/format';
import type { ActionMessage, MaintenanceJob, MaintenanceRun, SystemCheck, SystemCheckState } from '@/types/admin';

const DatabaseBackupModal = dynamic(() => import('@/components/ScraperConfigModal').then((m) => m.ScraperConfigModal), { ssr: false });
const ScoreboardCheckModal = dynamic(() => import('@/components/common/ScoreboardCheckModal').then((m) => m.ScoreboardCheckModal), { ssr: false });

const CHECK_KEYS = {
  database: ['systemDatabase', 'systemDatabaseDesc'],
  cache: ['systemCache', 'systemCacheDesc'],
  mail: ['systemMail', 'systemMailDesc'],
  discord: ['systemDiscord', 'systemDiscordDesc'],
  ocr: ['systemOcr', 'systemOcrDesc'],
  scheduler: ['systemScheduler', 'systemSchedulerDesc'],
  email_verification: ['systemEmailVerification', 'systemEmailVerificationDesc'],
  altcha: ['systemAltcha', 'systemAltchaDesc'],
  ban_list: ['systemBanList', 'systemBanListDesc'],
} as const;

const STATE_KEYS = { ok: 'systemStateOk', warn: 'systemStateWarn', off: 'systemStateOff', error: 'systemStateError' } as const;
const STATE_TONES: Record<SystemCheckState, BadgeTone> = { ok: 'green', warn: 'amber', off: 'neutral', error: 'red' };

const JOB_KEYS = {
  streak_inactivity: ['maintStreaks', 'maintStreaksDesc'],
  content_evidence: ['maintEvidence', 'maintEvidenceDesc'],
  sanction_emails: ['maintSanctionEmails', 'maintSanctionEmailsDesc'],
  ban_list: ['maintBanList', 'maintBanListDesc'],
  minigame_sessions: ['maintMinigameSessions', 'maintMinigameSessionsDesc'],
  bug_report_files: ['maintBugReportFiles', 'maintBugReportFilesDesc'],
  revoked_sessions: ['maintRevokedSessions', 'maintRevokedSessionsDesc'],
  catalog_cache: ['maintCache', 'maintCacheDesc'],
} as const;

interface ToolsProps {
  refreshKey: number;
  notify: (message: ActionMessage) => void;
  /** A purge or restore changed the data every other section shows. */
  onDataChanged: () => void;
}

/** One drawer; its rows are separated by rules. Open or closed is remembered per card. */
function ToolCard({
  id,
  title,
  subtitle,
  children,
  action,
  className,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const [open, toggle] = usePersistentDrawer(adminToolDrawerKey(id), true);
  return (
    <AccordionSection
      as="section"
      title={title}
      open={open}
      onToggle={toggle}
      headerAction={action}
      className={cn('h-full', className)}
      bodyClassName="p-0"
    >
      {subtitle && <p className="border-b border-border-color p-4 text-center type-body text-text-muted sm:px-5">{subtitle}</p>}
      <ul className="divide-y divide-border-subtle">{children}</ul>
    </AccordionSection>
  );
}

/** A row: what it is on the left, its state or its button on the right. */
function ToolRow({ title, description, meta, children }: { title: React.ReactNode; description: string; meta?: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <p className="type-strong text-text-primary">{title}</p>
        <p className="type-caption text-text-muted">{description}</p>
        {meta && <p className="mt-0.5 type-micro text-text-secondary">{meta}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </li>
  );
}

export function AdminToolsSection({ refreshKey, notify, onDataChanged }: ToolsProps) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.admin;
  const [checks, setChecks] = useState<SystemCheck[] | null>(null);
  const [rechecking, setRechecking] = useState(false);
  // The checks load with the section and on every refresh; the button re-runs them on demand.
  const [checkedFor, setCheckedFor] = useState<number | null>(null);
  const checking = rechecking || checkedFor !== refreshKey;
  const [jobs, setJobs] = useState<MaintenanceJob[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [backupTab, setBackupTab] = useState<ScraperTab | null>(null);
  const [ocrOpen, setOcrOpen] = useState(false);

  const fail = useCallback((err: unknown) => notify({ type: 'error', text: getErrorMessage(err, t.networkError) }), [notify, t.networkError]);

  const loadChecks = useCallback(async () => {
    setRechecking(true);
    try {
      setChecks((await fetchSystemChecks()).checks ?? []);
    } catch (err: unknown) {
      fail(err);
    } finally {
      setRechecking(false);
    }
  }, [fail]);

  useEffect(() => {
    let cancelled = false;
    fetchSystemChecks()
      .then((data) => !cancelled && setChecks(data.checks ?? []))
      .catch((err: unknown) => !cancelled && fail(err))
      .finally(() => !cancelled && setCheckedFor(refreshKey));
    listMaintenanceJobs()
      .then((data) => !cancelled && setJobs(data.jobs ?? []))
      .catch((err: unknown) => !cancelled && fail(err));
    return () => {
      cancelled = true;
    };
  }, [refreshKey, fail]);

  /** Runs one tool action, labelled `id` while it is in flight, and reports how it went. */
  const run = async (id: string, action: () => Promise<string>) => {
    setRunning(id);
    try {
      notify({ type: 'success', text: await action() });
    } catch (err: unknown) {
      fail(err);
    } finally {
      setRunning(null);
    }
  };

  const label = <K extends keyof typeof t>(key: K) => t[key];
  const when = (iso: string) => formatDateTime(iso, locale, { dateStyle: 'medium', timeStyle: 'short' });
  const lastRunText = (last: MaintenanceRun | null) =>
    !last?.last_run_at
      ? t.neverRun
      : formatMessage(last.last_trigger === 'schedule' ? t.lastRunScheduled : t.lastRunManual, { date: when(last.last_run_at) });

  return (
    <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-2">
      <ToolCard
        id="system"
        title={t.systemTitle}
        subtitle={t.systemSubtitle}
        action={
          <Button size="sm" icon onClick={() => void loadChecks()} aria-label={t.systemRecheck} loading={checking}>
            <RefreshCw className="icon-md" aria-hidden="true" />
          </Button>
        }
      >
        {(checks ?? []).map((check) => {
          const keys = CHECK_KEYS[check.key as keyof typeof CHECK_KEYS];
          const details = [
            check.detail === 'switched_off' ? t.systemSwitchedOff : check.detail,
            check.latency_ms !== undefined ? formatMessage(t.systemLatency, { ms: check.latency_ms }) : null,
            check.last_run_at ? formatMessage(t.lastRunScheduled, { date: when(check.last_run_at) }) : null,
          ].filter(Boolean);
          return (
            <ToolRow key={check.key} title={keys ? label(keys[0]) : check.key} description={keys ? label(keys[1]) : ''} meta={details.join(', ') || undefined}>
              <Badge tone={STATE_TONES[check.state]} size="xs">{label(STATE_KEYS[check.state])}</Badge>
            </ToolRow>
          );
        })}
      </ToolCard>

      <ToolCard id="maintenance" title={t.maintenanceTitle} subtitle={t.maintenanceSubtitle}>
        {jobs.map(({ key, last_run }) => {
          const keys = JOB_KEYS[key as keyof typeof JOB_KEYS];
          const name = keys ? label(keys[0]) : key;
          return (
            <ToolRow key={key} title={name} description={keys ? label(keys[1]) : ''} meta={lastRunText(last_run)}>
              <Button
                size="sm"
                loading={running === key}
                disabled={running !== null}
                leftIcon={<Play className="icon-sm" aria-hidden="true" />}
                onClick={() =>
                  run(key, async () => {
                    const result = await runMaintenanceJob(key);
                    setJobs((list) => list.map((job) => (job.key === key ? { ...job, last_run: result.last_run } : job)));
                    return formatMessage(t.maintenanceDone, { name, count: result.affected }, locale);
                  })
                }
              >
                {t.runNow}
              </Button>
            </ToolRow>
          );
        })}
      </ToolCard>

      <ToolCard
        id="database"
        title={t.databaseTitle}
        subtitle={t.databaseSubtitle}
        action={
          <a href={pgAdminUrl()} target="_blank" rel="noopener noreferrer" className={buttonClassName('secondary', 'sm')}>
            <Database className="icon-sm" aria-hidden="true" />
            {t.pgAdmin}
            <ExternalLink className="icon-xs" aria-hidden="true" />
          </a>
        }
      >
        <ToolRow title={t.exportJson} description={t.exportBackupDesc}>
          <Button size="sm" leftIcon={<Download className="icon-sm" aria-hidden="true" />} onClick={() => setBackupTab('export')}>
            {t.export}
          </Button>
        </ToolRow>
        <ToolRow title={t.importJson} description={t.importBackupDesc}>
          <Button size="sm" leftIcon={<Upload className="icon-sm" aria-hidden="true" />} onClick={() => setBackupTab('import')}>
            {t.import}
          </Button>
        </ToolRow>
        <ToolRow title={t.purgeReset} description={t.purgeDesc}>
          <Button size="sm" variant="danger" leftIcon={<Trash2 className="icon-sm" aria-hidden="true" />} onClick={() => setBackupTab('purge')}>
            {t.purge}
          </Button>
        </ToolRow>
      </ToolCard>

      <ToolCard id="testing" title={t.testingTitle} subtitle={t.testingSubtitle}>
        <ToolRow title={t.ocrCheck} description={t.ocrCheckDesc}>
          <Button size="sm" leftIcon={<ScanText className="icon-sm" aria-hidden="true" />} onClick={() => setOcrOpen(true)}>
            {t.openTest}
          </Button>
        </ToolRow>
        <ToolRow title={t.testEmail} description={t.testEmailDesc}>
          <Button
            size="sm"
            loading={running === 'email'}
            disabled={running !== null}
            leftIcon={<Mail className="icon-sm" aria-hidden="true" />}
            onClick={() => run('email', async () => formatMessage(t.testEmailSent, { email: (await sendTestEmail()).sent_to }))}
          >
            {t.sendTest}
          </Button>
        </ToolRow>
        <ToolRow title={t.testDiscord} description={t.testDiscordDesc}>
          <Button
            size="sm"
            loading={running === 'discord'}
            disabled={running !== null}
            leftIcon={<MessageSquare className="icon-sm" aria-hidden="true" />}
            onClick={() =>
              run('discord', async () => {
                await sendTestDiscord();
                return t.testDiscordSent;
              })
            }
          >
            {t.sendTest}
          </Button>
        </ToolRow>
      </ToolCard>

      <ToolCard id="analytics" title={t.analytics} className="xl:col-span-2">
        <ToolRow title={t.analytics} description={t.analyticsTitle}>
          <a href={analyticsUrl()} target="_blank" rel="noopener noreferrer" className={buttonClassName('secondary', 'sm')}>
            <LineChart className="icon-sm" aria-hidden="true" />
            {t.analytics}
            <ExternalLink className="icon-xs" aria-hidden="true" />
          </a>
        </ToolRow>
      </ToolCard>

      {backupTab && (
        <DatabaseBackupModal
          key={backupTab}
          isOpen
          initialTab={backupTab}
          onClose={() => setBackupTab(null)}
          onPurgeSuccess={onDataChanged}
        />
      )}
      <ScoreboardCheckModal isOpen={ocrOpen} onClose={() => setOcrOpen(false)} />
    </div>
  );
}
