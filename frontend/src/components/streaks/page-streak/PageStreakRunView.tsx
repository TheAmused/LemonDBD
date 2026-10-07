'use client';
// frontend/src/components/streaks/page-streak/PageStreakRunView.tsx
import { Button } from '@/components/common/Button';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { usePageStreakRun } from './usePageStreakRun';
import { RunHeader } from './RunHeader';
import { PerkPageGrid } from './PerkPageGrid';
import { BuildPanel } from './BuildPanel';
import { StreakActionBar, StreakActionButton } from '../StreakActionBar';
import { PageStreakRulesModal } from './PageStreakRulesModal';
import { PageStreakStatsDrawer } from './PageStreakStatsDrawer';
import { ChallengeErrorBanner, ChallengePanel, ChallengeVictoryCard } from '../ChallengePanel';
import { ChallengeProgress } from '../ChallengeProgress';
import { ChallengeCompletionHistoryDrawer, Confetti, ResetConfirmModal } from '../lazyChallengeParts';
import { useCelebrateOnRise, useCelebration } from '../useCelebration';
import { staticUrl } from '@/utils/staticUrl';
import { useDictionary } from '@/context/DictionaryContext';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';

interface PageStreakRunViewProps {
  locale: string;
  killer: string;
}

export const PageStreakRunView: React.FC<PageStreakRunViewProps> = ({ locale, killer }) => {
  const dict = useDictionary();
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
  const { celebrating, celebrate } = useCelebration();

  // Opening a killer with no run starts one straight away. A failed start sets `error`,
  // which stops this from retrying in a loop.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (loading || run || busy || error || autoStartedRef.current) return;
    autoStartedRef.current = true;
    startRun();
  }, [loading, run, busy, error, startRun]);
  // A reset (or another killer) leaves no run again, so allow the next auto-start.
  useEffect(() => {
    if (run) autoStartedRef.current = false;
  }, [run, killer]);

  // A new page (or a new attempt) always starts from an empty, unconfirmed build.
  useEffect(() => {
    setSelected([]);
    setConfirmed(false);
  }, [run?.current_page, run?.attempt, run?.status]);

  useCelebrateOnRise(run?.status === 'completed', celebrate);

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
    <div className={run && run.status !== 'completed' ? 'pb-16' : ''}>
      <Confetti active={celebrating} />
      <Link
        href={`/${locale}/streaks/killer/page-streak`}
        className="inline-flex items-center gap-1.5 rounded type-strong text-text-secondary transition-colors hover:text-accent-red focus:outline-none focus:ring-2 focus:ring-accent-red"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>{dict.streaks.backToKillers}</span>
      </Link>

      {error && (
        <div className="mt-4">
          <ChallengeErrorBanner message={error} />
        </div>
      )}

      {loading && (
        <p className="py-10 text-center text-xs text-text-muted">
          {dict.streaks.loadingStreak}
        </p>
      )}

      {!loading && run && (
        <div className="mt-4 [&>*:last-child]:mb-0">
          <ChallengePanel
            progress={
              <ChallengeProgress
                current={run.status === 'completed' ? run.page_count : run.current_page - 1}
                total={run.page_count}
                checkpoints={[]}
              />
            }
            header={
              <RunHeader
                run={run}
                onOpenReset={() => setConfirmingReset(true)}
                onOpenRules={() => setIsRulesOpen(true)}
                onOpenStats={() => setIsStatsOpen(true)}
                onOpenHistory={() => setIsHistoryOpen(true)}
              />
            }
          >
          {run.status === 'completed' ? (
            <ChallengeVictoryCard
              title={dict.streaks.pageStreakVictoryTitle}
              subtitle={`${dict.streaks.pageStreakVictoryPrefix} ${killerDisplayName}`}
              onRestart={() => setConfirmingReset(true)}
              busy={busy}
            />
          ) : (
            <>
              <StreakActionBar>
                {confirmed ? (
                  <>
                    <StreakActionButton
                      variant="red"
                      disabled={busy}
                      onClick={() => {
                        setLastWasLoss(true);
                        submitResult(run.current_page, selected, 'loss');
                      }}
                    >
                      {dict.streaks.loseMatch}
                    </StreakActionButton>
                    <StreakActionButton
                      variant="green"
                      disabled={busy}
                      onClick={() => {
                        setLastWasLoss(false);
                        submitResult(run.current_page, selected, 'win');
                      }}
                    >
                      {dict.streaks.winMatch}
                    </StreakActionButton>
                  </>
                ) : (
                  <StreakActionButton
                    variant="red"
                    disabled={busy || selected.length !== buildSize}
                    onClick={() => setConfirmed(true)}
                  >
                    {dict.streaks.confirmBuild}
                  </StreakActionButton>
                )}
              </StreakActionBar>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start">
                <div>
                  <PerkPageGrid
                    key={`${run.attempt}-${run.current_page}`}
                    perks={currentPagePerks}
                    selected={selected}
                    onToggle={toggle}
                    variant={lastWasLoss ? 'reset' : 'enter'}
                    iconByPerk={iconByPerk}
                  />

                  {nextPagePerks.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowNextPage((open) => !open)}
                        aria-expanded={showNextPage}
                        className={`mt-4 flex w-full items-center gap-2 rounded text-tiny uppercase tracking-widest text-text-muted transition-colors hover:text-accent-red focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red motion-reduce:transition-none ${showNextPage ? 'mb-2.5' : ''}`}
                      >
                        <ChevronRight
                          className={`h-3.5 w-3.5 transition-transform duration-300 motion-reduce:transition-none ${
                            showNextPage ? 'rotate-90' : ''
                          }`}
                        />
                        <span>
                          {dict.streaks.pageLabel} {run.current_page + 1}
                        </span>
                        <span className="h-px flex-1 bg-border-color" />
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
                </div>

                <aside className="order-first lg:sticky lg:top-20 lg:order-none">
                  <BuildPanel
                    selected={selected}
                    size={buildSize}
                    iconByPerk={iconByPerk}
                    killerName={killerDisplayName}
                    avatarSrc={staticUrl(run.killer_avatar)}
                  />
                </aside>
              </div>
            </>
          )}
          </ChallengePanel>

          <ResetConfirmModal
            open={confirmingReset}
            busy={busy}
            message={`${dict.streaks.pageStreakResetConfirmPrefix} ${killerDisplayName} ${dict.streaks.pageStreakResetConfirmSuffix}`}
            onCancel={() => setConfirmingReset(false)}
            onConfirm={() => {
              setConfirmingReset(false);
              resetRun();
            }}
          />

          <PageStreakRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
          <PageStreakStatsDrawer
            isOpen={isStatsOpen}
            onClose={() => setIsStatsOpen(false)}
            stats={stats}
            attempts={run.attempt}
          />
          <ChallengeCompletionHistoryDrawer
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            completions={completions}
          />
        </div>
      )}
    </div>
  );
};
