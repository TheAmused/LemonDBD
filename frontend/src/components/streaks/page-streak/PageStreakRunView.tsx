'use client';
// frontend/src/components/streaks/page-streak/PageStreakRunView.tsx
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Trophy, RotateCcw } from 'lucide-react';
import { usePageStreakRun } from './usePageStreakRun';
import { RunHeader } from './RunHeader';
import { PerkPageGrid } from './PerkPageGrid';
import { BuildBar } from './BuildBar';
import { StartRunPanel } from './StartRunPanel';
import { PageStreakRulesModal } from './PageStreakRulesModal';
import { PageStreakStatsDrawer } from './PageStreakStatsDrawer';
import { Confetti } from '../Confetti';
import { ResetConfirmModal } from '../ResetConfirmModal';
import { ChallengeCompletionHistoryDrawer } from '../ChallengeCompletionHistoryDrawer';
import { staticUrl } from '@/utils/staticUrl';
import { useStreaksDict } from '@/context/StreaksDictContext';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';

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
  const dict = useStreaksDict();
  const killerDisplayName = useCharacterDisplayName()(killer);
  const { run, stats, completions, loading, busy, error, startRun, submitResult, resetRun } = usePageStreakRun(killer);
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
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
          <StartRunPanel killer={killerDisplayName} busy={busy} onStart={startRun} dict={dict} />
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
            onOpenHistory={() => setIsHistoryOpen(true)}
            dict={dict}
          />

          {run.status === 'completed' ? (
            <div className="mb-8 mt-6 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-emerald-500/[0.03] px-6 py-10 text-center shadow-lg">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-emerald-400 bg-emerald-500/15 text-emerald-500 dark:text-emerald-400">
                <Trophy className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {dict?.streaks?.pageStreakVictoryPrefix || 'You won the Page Streak on'} {killerDisplayName}
              </h2>
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                disabled={busy}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-950/30 transition-colors hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                {dict?.streaks?.startNewRun || 'Start a new run'}
              </button>
            </div>
          ) : (
            <>
              {confirmed && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3 ps-rise">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setLastWasLoss(false);
                      submitResult(run.current_page, selected, 'win');
                    }}
                    className="flex-1 max-w-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg transition-all cursor-pointer motion-reduce:transition-none"
                  >
                    {dict?.streaks?.winMatch || 'WIN MATCH'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setLastWasLoss(true);
                      submitResult(run.current_page, selected, 'loss');
                    }}
                    className="flex-1 max-w-xs bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg transition-all cursor-pointer motion-reduce:transition-none"
                  >
                    {dict?.streaks?.loseMatch || 'LOSE MATCH'}
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
                dict={dict}
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
            message={`${dict?.streaks?.pageStreakResetConfirmPrefix || 'Reset'} ${killerDisplayName} ${dict?.streaks?.pageStreakResetConfirmSuffix || 'to page 1? History is kept.'}`}
            onCancel={() => setConfirmingReset(false)}
            onConfirm={() => {
              setConfirmingReset(false);
              resetRun();
            }}
            dict={dict}
          />

          <PageStreakRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} dict={dict} />
          <PageStreakStatsDrawer isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={stats} dict={dict} />
          <ChallengeCompletionHistoryDrawer
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            title={killerDisplayName}
            accent="orange"
            completions={completions}
            dict={dict}
          />
        </div>
      )}
    </div>
  );
};
