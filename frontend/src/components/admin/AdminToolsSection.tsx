'use client';
// frontend/src/components/admin/AdminToolsSection.tsx
//
// The operator's corner: the live state of every dependency, run-now housekeeping, database backup
// and restore, and the tests that prove a feature works end to end (OCR, email, Discord).
import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Database, Download, ExternalLink, Mail, MessageSquare, Play, RefreshCw, ScanText, Trash2, Upload } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/common/Badge';
import { Button, buttonClassName } from '@/components/common/Button';
import { Surface } from '@/components/common/Surface';
import { pgAdminUrl } from '@/components/admin/adminLinks';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
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
  catalog_cache: ['maintCache', 'maintCacheDesc'],
} as const;

interface ToolsProps {
  refreshKey: number;
  notify: (message: ActionMessage) => void;
  /** A purge or restore changed the data every other section shows. */
  onDataChanged: () => void;
}

/** One titled card; its rows are separated by rules. */
function ToolCard({ title, subtitle, children, action }: { title: string; subtitle: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Surface as="section" padding="none" className="flex flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-border-color p-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="type-label text-text-primary">{title}</h2>
          <p className="mt-0.5 type-body text-text-muted">{subtitle}</p>
        </div>
        {action}
      </header>
      <ul className="divide-y divide-border-subtle">{children}</ul>
    </Surface>
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
  const [checking, setChecking] = useState(false);
  const [jobs, setJobs] = useState<MaintenanceJob[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [backupTab, setBackupTab] = useState<ScraperTab | null>(null);
  const [ocrOpen, setOcrOpen] = useState(false);

  const fail = useCallback((err: unknown) => notify({ type: 'error', text: getErrorMessage(err, t.networkError) }), [notify, t.networkError]);

  const loadChecks = useCallback(async () => {
    setChecking(true);
    try {
      setChecks((await fetchSystemChecks()).checks ?? []);
    } catch (err: unknown) {
      fail(err);
    } finally {
      setChecking(false);
    }
  }, [fail]);

  useEffect(() => {
    void loadChecks();
    listMaintenanceJobs()
      .then((data) => setJobs(data.jobs ?? []))
      .catch(fail);
  }, [refreshKey, loadChecks, fail]);

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
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
      <ToolCard
        title={t.systemTitle}
        subtitle={t.systemSubtitle}
        action={
          <Button size="sm" icon onClick={() => void loadChecks()} aria-label={t.systemRecheck} loading={checking}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
        }
      >
        {(checks ?? []).map((check) => {
          const keys = CHECK_KEYS[check.key as keyof typeof CHECK_KEYS];
          const details = [
            check.detail,
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

      <ToolCard title={t.maintenanceTitle} subtitle={t.maintenanceSubtitle}>
        {jobs.map(({ key, last_run }) => {
          const keys = JOB_KEYS[key as keyof typeof JOB_KEYS];
          const name = keys ? label(keys[0]) : key;
          return (
            <ToolRow key={key} title={name} description={keys ? label(keys[1]) : ''} meta={lastRunText(last_run)}>
              <Button
                size="sm"
                loading={running === key}
                disabled={running !== null}
                leftIcon={<Play className="h-3.5 w-3.5" aria-hidden="true" />}
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
        title={t.databaseTitle}
        subtitle={t.databaseSubtitle}
        action={
          <a href={pgAdminUrl()} target="_blank" rel="noopener noreferrer" className={buttonClassName('secondary', 'sm')}>
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
            {t.pgAdmin}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        }
      >
        <ToolRow title={t.exportJson} description={t.exportBackupDesc}>
          <Button size="sm" leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setBackupTab('export')}>
            {t.export}
          </Button>
        </ToolRow>
        <ToolRow title={t.importJson} description={t.importBackupDesc}>
          <Button size="sm" leftIcon={<Upload className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setBackupTab('import')}>
            {t.import}
          </Button>
        </ToolRow>
        <ToolRow title={t.purgeReset} description={t.purgeDesc}>
          <Button size="sm" variant="danger" leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setBackupTab('purge')}>
            {t.purge}
          </Button>
        </ToolRow>
      </ToolCard>

      <ToolCard title={t.testingTitle} subtitle={t.testingSubtitle}>
        <ToolRow title={t.ocrCheck} description={t.ocrCheckDesc}>
          <Button size="sm" leftIcon={<ScanText className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setOcrOpen(true)}>
            {t.openTest}
          </Button>
        </ToolRow>
        <ToolRow title={t.testEmail} description={t.testEmailDesc}>
          <Button
            size="sm"
            loading={running === 'email'}
            disabled={running !== null}
            leftIcon={<Mail className="h-3.5 w-3.5" aria-hidden="true" />}
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
            leftIcon={<MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />}
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
