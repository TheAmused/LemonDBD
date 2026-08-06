'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { usePageStreakRun } from './usePageStreakRun';
import { RunHeader } from './RunHeader';
import { PerkPageGrid } from './PerkPageGrid';
import { BuildBar } from './BuildBar';
import { RunHistory } from './RunHistory';
import { StartRunPanel } from './StartRunPanel';
import { usePerkArtwork } from './usePerkArtwork';

interface PageStreakRunViewProps {
  locale: string;
  killer: string;
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-2.5 mt-6 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-widest text-slate-600">
    <span>{children}</span>
    <span className="h-px flex-1 bg-slate-800" />
  </div>
);

export const PageStreakRunView: React.FC<PageStreakRunViewProps> = ({ locale, killer }) => {
  const { run, loading, busy, error, startRun, submitResult, resetRun } = usePageStreakRun(killer);
  const { iconByPerk, avatarByKiller } = usePerkArtwork();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [lastWasLoss, setLastWasLoss] = useState(false);

  // A new page (or a new attempt) always starts from an empty, unconfirmed build.
  useEffect(() => {
    setSelected([]);
    setConfirmed(false);
  }, [run?.current_page, run?.attempt, run?.status]);

  const currentPagePerks = run ? run.pages[run.current_page - 1] ?? [] : [];
  const buildSize = Math.min(4, currentPagePerks.length);
  const nextPagePerks = run && run.current_page < run.page_count ? run.pages[run.current_page] : [];

  const toggle = (name: string) =>
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= buildSize) return prev;
      return [...prev, name];
    });

  return (
    <div>
      <Link
        href={`/${locale}/streaks/killer/page-streak`}
        className="inline-flex items-center gap-1.5 rounded text-xs font-bold text-slate-500 transition-colors hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to killers</span>
      </Link>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.07] px-4 py-3 text-xs text-rose-300">
          {error}
        </p>
      )}

      {loading && <p className="py-10 text-center text-xs text-slate-500">Loading streak…</p>}

      {!loading && !run && (
        <div className="mt-5">
          <StartRunPanel killer={killer} busy={busy} onStart={startRun} />
        </div>
      )}

      {!loading && run && (
        <div className="mt-5">
          <RunHeader run={run} avatarSrc={avatarByKiller[run.killer]} />

          {run.status === 'completed' ? (
            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] px-5 py-6 text-center">
              <p className="text-sm font-extrabold text-emerald-400">All {run.page_count} pages cleared on {killer}</p>
              <p className="mt-1 text-xs text-slate-400">Reset the run if you want to go through it again.</p>
            </div>
          ) : (
            <>
              <SectionLabel>Page {run.current_page} — pick {buildSize} perks</SectionLabel>
              <PerkPageGrid
                key={`${run.attempt}-${run.current_page}`}
                perks={currentPagePerks}
                selected={selected}
                onToggle={toggle}
                variant={lastWasLoss ? 'reset' : 'enter'}
                iconByPerk={iconByPerk}
              />

              <SectionLabel>Your build</SectionLabel>
              <BuildBar
                selected={selected}
                size={buildSize}
                confirmed={confirmed}
                onConfirm={() => setConfirmed(true)}
                iconByPerk={iconByPerk}
              />

              {confirmed && (
                <div className="mt-3 flex flex-wrap gap-2.5 ps-rise">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setLastWasLoss(false);
                      submitResult(run.current_page, selected, 'win');
                    }}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-extrabold text-emerald-400 disabled:opacity-50"
                  >
                    {run.current_page >= run.page_count ? 'Win → finish' : `Win → page ${run.current_page + 1}`}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setLastWasLoss(true);
                      submitResult(run.current_page, selected, 'loss');
                    }}
                    className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-4 py-2 text-xs font-extrabold text-rose-400 disabled:opacity-50"
                  >
                    Loss → back to page 1
                  </button>
                </div>
              )}

              {nextPagePerks.length > 0 && (
                <>
                  <SectionLabel>Next up — page {run.current_page + 1}</SectionLabel>
                  <PerkPageGrid perks={nextPagePerks} dimmed iconByPerk={iconByPerk} />
                </>
              )}
            </>
          )}

          <SectionLabel>History</SectionLabel>
          <RunHistory history={run.history} />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {confirmingReset ? (
              <>
                <span className="text-xs text-slate-400">Reset {killer} to page 1? History is kept.</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setConfirmingReset(false);
                    resetRun();
                  }}
                  className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-extrabold text-rose-400 disabled:opacity-50"
                >
                  Yes, reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-bold text-slate-400"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 transition-colors hover:text-rose-400"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset this streak
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
