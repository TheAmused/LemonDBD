import type { Dictionary } from '@/locales/types';
// frontend/src/components/streaks/page-streak/PageStreakRunView.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { usePageStreakRun } from './usePageStreakRun';
import { RunHeader } from './RunHeader';
import { PerkPageGrid } from './PerkPageGrid';
import { BuildBar } from './BuildBar';
import { StartRunPanel } from './StartRunPanel';
import { PageStreakRulesModal } from './PageStreakRulesModal';
import { PageStreakStatsDrawer } from './PageStreakStatsDrawer';
import { Confetti } from '../Confetti';
import { ResetConfirmModal } from '../ResetConfirmModal';
import { staticUrl } from '@/utils/staticUrl';

interface PageStreakRunViewProps {
  locale: string;
  killer: string;
  dict?: Dictionary;
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-2.5 mt-6 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-widest text-slate-600">
    <span>{children}</span>
    <span className="h-px flex-1 bg-slate-800" />
  </div>
);

export const PageStreakRunView: React.FC<PageStreakRunViewProps> = ({ locale, killer, dict }) => {
  const { run, stats, loading, busy, error, startRun, submitResult, resetRun } = usePageStreakRun(killer);
  const iconByPerk = React.useMemo(() => {
    const entries = Object.entries(run?.perk_icons ?? {});
    return Object.fromEntries(
      entries.map(([name, path]) => [name, staticUrl(path)]).filter(([, url]) => url)
    ) as Record<string, string>;
  }, [run?.perk_icons]);
  const [selected, setSelected] = useState<string[]>([]);
  const [showNextPage, setShowNextPage] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [lastWasLoss, setLastWasLoss] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  // A new page (or a new attempt) always starts from an empty, unconfirmed build.
  useEffect(() => {
    setSelected([]);
    setConfirmed(false);
  }, [run?.current_page, run?.attempt, run?.status]);

  // Fire once when the run flips to completed, not on every later render or reload.
  const wasCompletedRef = useRef(false);
  useEffect(() => {
    const isCompleted = run?.status === 'completed';
    if (isCompleted && !wasCompletedRef.current) {
      setCelebrating(true);
      const timer = setTimeout(() => setCelebrating(false), 3500);
      wasCompletedRef.current = true;
      return () => clearTimeout(timer);
    }
    if (!isCompleted) {
      wasCompletedRef.current = false;
    }
  }, [run?.status]);

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
      <Confetti active={celebrating} />
      <Link
        href={`/${locale}/streaks/killer/page-streak`}
        className="inline-flex items-center gap-1.5 rounded text-xs font-bold text-slate-500 transition-colors hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>{dict?.streaks?.backToKillers || 'Back to killers'}</span>
      </Link>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.07] px-4 py-3 text-xs text-rose-300">
          {error}
        </p>
      )}

      {loading && (
        <p className="py-10 text-center text-xs text-slate-500">
          {dict?.streaks?.loadingStreak || 'Loading streak…'}
        </p>
      )}

      {!loading && !run && (
        <div className="mt-5">
          <StartRunPanel killer={killer} busy={busy} onStart={startRun} />
        </div>
      )}

      {!loading && run && (
        <div className="mt-5">
          <RunHeader
            run={run}
            avatarSrc={staticUrl(run.killer_avatar)}
            onOpenReset={() => setConfirmingReset(true)}
            onOpenRules={() => setIsRulesOpen(true)}
            onOpenStats={() => setIsStatsOpen(true)}
          />

          {run.status === 'completed' ? (
            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] px-5 py-6 text-center">
              <p className="text-sm font-extrabold text-emerald-400">
                {dict?.streaks?.allPagesClearedPrefix || 'All'} {run.page_count} {dict?.streaks?.pagesClearedOnSuffix || 'pages cleared on'} {killer}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {dict?.streaks?.resetRunPrompt || 'Reset the run if you want to go through it again.'}
              </p>
            </div>
          ) : (
            <>
              {confirmed && (
                <div className="mt-5 flex flex-wrap gap-3 ps-rise">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setLastWasLoss(false);
                      submitResult(run.current_page, selected, 'win');
                    }}
                    className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-8 py-4 text-base font-extrabold tracking-wide text-emerald-400 transition-colors hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 motion-reduce:transition-none"
                  >
                    {dict?.stats?.win || 'Win'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setLastWasLoss(true);
                      submitResult(run.current_page, selected, 'loss');
                    }}
                    className="flex-1 rounded-xl border border-rose-500/35 bg-rose-500/10 px-8 py-4 text-base font-extrabold tracking-wide text-rose-400 transition-colors hover:bg-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50 motion-reduce:transition-none"
                  >
                    {dict?.stats?.loss || 'Loss'}
                  </button>
                </div>
              )}
              <SectionLabel>
                {dict?.streaks?.pageLabel || 'Page'} {run.current_page}
                {dict?.streaks?.pickCountSeparator || ', pick'} {buildSize} {dict?.streaks?.perksCount || 'perks'}
              </SectionLabel>
              <PerkPageGrid
                key={`${run.attempt}-${run.current_page}`}
                perks={currentPagePerks}
                selected={selected}
                onToggle={toggle}
                variant={lastWasLoss ? 'reset' : 'enter'}
                iconByPerk={iconByPerk}
              />

              <SectionLabel>{dict?.streaks?.yourBuild || 'Your build'}</SectionLabel>
              <BuildBar
                selected={selected}
                size={buildSize}
                confirmed={confirmed}
                onConfirm={() => setConfirmed(true)}
                iconByPerk={iconByPerk}
              />

              {nextPagePerks.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowNextPage((open) => !open)}
                    aria-expanded={showNextPage}
                    className="mb-2.5 mt-6 flex w-full items-center gap-2 rounded font-mono text-[10.5px] uppercase tracking-widest text-slate-600 transition-colors hover:text-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 motion-reduce:transition-none"
                  >
                    <ChevronRight
                      className={`h-3.5 w-3.5 transition-transform duration-300 motion-reduce:transition-none ${
                        showNextPage ? 'rotate-90' : ''
                      }`}
                    />
                    <span>
                      {dict?.streaks?.nextUpPagePrefix || 'Next up, page'} {run.current_page + 1}
                    </span>
                    <span className="h-px flex-1 bg-slate-800" />
                  </button>
                  {/* grid-template-rows animates 0fr -> 1fr, which height:auto cannot do */}
                  <div
                    aria-hidden={!showNextPage}
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                      showNextPage ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <PerkPageGrid perks={nextPagePerks} dimmed iconByPerk={iconByPerk} />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <ResetConfirmModal
            open={confirmingReset}
            busy={busy}
            message={`Reset ${killer} to page 1? History is kept.`}
            onCancel={() => setConfirmingReset(false)}
            onConfirm={() => {
              setConfirmingReset(false);
              resetRun();
            }}
          />

          <PageStreakRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
          <PageStreakStatsDrawer isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={stats} />
        </div>
      )}
    </div>
  );
};
