'use client';
// frontend/src/components/common/ScoreboardCheckModal.tsx
//
// Admin tool: upload an end-of-match scoreboard screenshot and see what the OCR
// reads. The image is analysed in memory on the server and never stored. Nothing
// is typed in: the server compares the screenshot with the logged-in account's
// alias (or login) and reads role, character, result and loadout from the image.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, CircleSlash, ImagePlus, CircleAlert, X } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { useDictionary } from '@/context/DictionaryContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { ApiError } from '@/utils/api';
import { formatMessage } from '@/utils/i18nFormat';
import { cn } from '@/utils/cn';
import { analyzeScoreboard, type Loadout, type LoadoutSlot, type ScoreboardReport } from '@/services/scoreboardApi';
import { Table, TableBody, TableHead, TableRow, Td, Th } from '@/components/common/Table';
import { Img } from '@/components/common/Img';
import { useOnValueChange } from '@/hooks/useOnValueChange';
import type { Dictionary } from '@/locales/types';

interface ScoreboardCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Dict = Dictionary['scoreboardCheck'];

function slotLabel(t: Dict, slot: LoadoutSlot | null | undefined): string {
  if (!slot || slot.empty) return t.emptySlot;
  if (!slot.name) return t.unrecognized;
  return slot.uncertain ? `${slot.name} (${t.unsure})` : slot.name;
}

const LoadoutCell: React.FC<{ t: Dict; loadout: Loadout | null }> = ({ t, loadout }) => {
  if (!loadout) return <span className="text-text-muted">—</span>;
  if (loadout.hidden) return <span className="text-text-muted">{t.hiddenLoadout}</span>;
  return (
    <div className="space-y-0.5">
      <p>
        <span className="text-text-muted">{t.perks}: </span>
        {loadout.perks.map((p) => slotLabel(t, p)).join(', ')}
      </p>
      {/* Survivors bring an item; the killer's slot shows their power, so `item` is null there. */}
      {loadout.item && (
        <p>
          <span className="text-text-muted">{t.item}: </span>
          {slotLabel(t, loadout.item)}
        </p>
      )}
      <p>
        <span className="text-text-muted">{t.addons}: </span>
        {loadout.addons.map((a) => slotLabel(t, a)).join(', ')}
      </p>
      <p>
        <span className="text-text-muted">{t.offering}: </span>
        {slotLabel(t, loadout.offering)}
      </p>
    </div>
  );
};

const CheckMark: React.FC<{ ok: boolean | null | undefined }> = ({ ok }) =>
  ok === true ? (
    <Check className="icon-md text-accent-green" />
  ) : ok === false ? (
    <X className="icon-md text-accent-red" />
  ) : (
    <CircleSlash className="icon-md text-text-muted" />
  );

export const ScoreboardCheckModal: React.FC<ScoreboardCheckModalProps> = ({ isOpen, onClose }) => {
  const t = useDictionary().scoreboardCheck;
  // The upload limit and the on/off switch are admin settings, served with the public configuration.
  const site = useSiteConfig();
  const maxBytes = site.limits.scoreboardUploadMaxBytes;
  const switchedOff = site.loaded && !site.features.scoreboardOcr;
  const tooLarge = formatMessage(t.tooLarge, { mb: Math.max(1, Math.round(maxBytes / (1024 * 1024))) });
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ScoreboardReport | null>(null);

  // The preview URL is made when a file is picked and released when it is replaced or the modal unmounts.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const reset = useCallback(() => {
    setFile(null);
    setPreviewUrl(null);
    setReport(null);
    setError(null);
  }, []);

  useOnValueChange(isOpen, (open) => {
    if (!open) reset();
  });

  const pick = (f: File | undefined | null) => {
    if (!f || switchedOff) return;
    setReport(null);
    if (!f.type.startsWith('image/')) return setError(t.notImage);
    if (f.size > maxBytes) return setError(tooLarge);
    setError(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const run = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      setReport(await analyzeScoreboard(file));
    } catch (e) {
      const code = e instanceof ApiError ? e.code : undefined;
      const status = e instanceof ApiError ? e.status : 0;
      setError(
        code === 'engine_unavailable'
          ? switchedOff ? t.switchedOff : t.unavailable
          : code === 'too_large'
          ? tooLarge
          : code === 'not_a_scoreboard'
          ? t.notAScoreboard
          : status === 429
          ? t.rateLimited
          : t.failed
      );
    } finally {
      setBusy(false);
    }
  };

  const checkRows: Array<[string, boolean | null | undefined]> = report?.checks
    ? [
        [t.checkPovIdentified, report.checks.pov_identified],
        [t.checkPlayerName, report.checks.player_name_matches],
      ]
    : [];

  const povText =
    report?.pov_won === true ? t.povWon : report?.pov_won === false ? t.povLost : t.povUnknown;

  const match = report?.match;
  const pov = report?.pov;
  const identity = report?.identity;
  const killsText = match
    ? match.ended
      ? String(match.kills_at_least)
      : formatMessage(t.killsAtLeast, { n: match.kills_at_least })
    : '—';
  const verdictText = match
    ? match.verdict_final && !match.ended
      ? `${t.verdicts[match.verdict]} (${t.verdictEarly})`
      : t.verdicts[match.verdict]
    : '—';

  const footer = report ? (
    <>
      <Button variant="secondary" onClick={reset}>
        {t.checkAnother}
      </Button>
      <Button variant="primary" onClick={onClose}>
        {t.close}
      </Button>
    </>
  ) : (
    <>
      <Button variant="secondary" onClick={onClose} disabled={busy}>
        {t.close}
      </Button>
      <Button variant="primary" onClick={() => { void run(); }} disabled={!file || switchedOff} loading={busy}>
        {busy ? t.analyzing : t.analyze}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title={t.title}
      footer={footer}
      busy={busy}
    >
      <div className="space-y-5">
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-card border border-accent-red/30 bg-accent-red/10 p-3 text-accent-red">
            <CircleAlert className="mt-0.5 icon-md shrink-0" />
            <p className="type-body">{error}</p>
          </div>
        )}

        {switchedOff && !error && (
          <output className="flex items-start gap-2 rounded-card border border-accent-amber/30 bg-accent-amber/10 p-3 text-accent-amber">
            <CircleSlash className="mt-0.5 icon-md shrink-0" aria-hidden="true" />
            <p className="type-body">{t.switchedOff}</p>
          </output>
        )}

        {!report && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                pick(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            {previewUrl ? (
              <div className="relative overflow-hidden rounded-card border border-border-color bg-bg-elevated">
                <Img src={previewUrl} alt={t.previewAlt} className="mx-auto max-h-72 w-auto object-contain" />
                <Button
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={reset}
                  leftIcon={<X />}
                  disabled={busy}
                >
                  {t.remove}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                disabled={switchedOff}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  pick(e.dataTransfer.files?.[0]);
                }}
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-control border-2 border-dashed border-border-color bg-bg-elevated px-4 py-10 text-text-secondary transition-colors hover:border-accent-red/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border-color"
              >
                <ImagePlus className="h-7 w-7" />
                <span className="type-strong text-text-primary">{t.chooseImage}</span>
                <span className="type-body">{t.dropHint}</span>
              </button>
            )}
            <p className="type-body text-text-secondary">{t.autoNote}</p>
            <p className="type-body text-text-muted">{t.privacyNote}</p>
          </>
        )}

        {report && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={report.passed ? 'green' : 'red'}>{report.passed ? t.passed : t.notPassed}</Badge>
              <span className="type-body text-text-secondary">{povText}</span>
            </div>

            {identity?.expected && (
              <p className="flex items-center gap-2 type-body text-text-secondary">
                <CheckMark ok={identity.matched} />
                <span>
                  {t.identity}: <span className="type-strong text-text-primary">{identity.expected}</span>{' '}
                  {identity.matched === true ? t.identityMatched : identity.matched === false ? t.identityMismatch : t.identityUnknown}
                </span>
              </p>
            )}

            {pov && (
              <div className="rounded-card border border-border-color bg-bg-elevated p-3">
                <p className="type-body text-text-muted">{t.yourResult}</p>
                <p className="type-strong text-text-primary">
                  {pov.role === 'killer' ? t.roleKiller : t.roleSurvivor}
                  {pov.character ? ` · ${pov.character}` : ''} · {t.outcomes[pov.outcome]}
                  {pov.result ? ` · ${t.results[pov.result]}` : ''}
                </p>
                <p className={cn('type-body', pov.result_final ? 'text-accent-green' : 'text-accent-amber')}>
                  {pov.result_final ? t.resultSettled : t.resultOpen}
                </p>
              </div>
            )}

            {report.summary && match && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {(
                  [
                    [t.colStatus, match.ended ? t.matchEnded : t.matchInProgress],
                    [t.verdict, verdictText],
                    [t.kills, killsText],
                    [t.escapes, report.summary.escapes],
                    [t.inTrial, report.summary.in_trial + report.summary.unknown],
                  ] as Array<[string, React.ReactNode]>
                ).map(([label, value]) => (
                  <div key={label} className="rounded-card border border-border-color bg-bg-elevated p-3">
                    <p className="type-body text-text-muted">{label}</p>
                    <p className="type-strong text-text-primary">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {report.owner_name && (
              <p className="type-body text-text-secondary">
                {t.owner}: <span className="type-strong text-text-primary">{report.owner_name}</span>
              </p>
            )}

            {report.rows && report.rows.length > 0 && (
              <Table framed density="sm">
                <TableHead>
                  <tr>
                    {[t.colRole, t.colCharacter, t.colPlayer, t.colPrestige, t.colBloodpoints, t.colStatus, t.colLoadout].map((h) => (
                      <Th key={h}>{h}</Th>
                    ))}
                  </tr>
                </TableHead>
                <TableBody>
                  {report.rows.map((r, i) => (
                    <TableRow key={i} className={cn(pov?.row === i && 'bg-accent-amber/5')}>
                      <Td>{r.role === 'killer' ? t.roleKiller : t.roleSurvivor}</Td>
                      <Td>{r.character ?? '—'}</Td>
                      <Td>
                        {r.player_name || '—'}
                        {r.is_bot && <span className="text-text-muted"> ({t.bot})</span>}
                      </Td>
                      <Td>{r.prestige ?? '—'}</Td>
                      <Td>{r.bloodpoints ?? '—'}</Td>
                      <Td>{t.status[r.status]}</Td>
                      <Td className="type-body">
                        <LoadoutCell t={t} loadout={r.loadout} />
                      </Td>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {checkRows.length > 0 && (
              <div>
                <p className="type-strong mb-2 text-text-primary">{t.checks}</p>
                <ul className="space-y-1.5">
                  {checkRows.map(([label, ok]) => (
                    <li key={label} className="flex items-center gap-2 type-body text-text-primary">
                      <CheckMark ok={ok} />
                      <span>{label}</span>
                      <span className="text-text-muted">
                        {ok === true ? t.checkMatched : ok === false ? t.checkFailed : t.checkSkipped}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.warnings && report.warnings.length > 0 && (
              <div>
                <p className="type-strong mb-1 text-text-primary">{t.warnings}</p>
                <ul className="list-disc space-y-1 pl-5 type-body text-text-secondary">
                  {report.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.fingerprint && (
              <p className="type-body break-all text-text-muted">
                {t.fingerprint}: {report.fingerprint}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
