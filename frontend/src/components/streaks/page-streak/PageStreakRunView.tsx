'use client';
// frontend/src/components/streaks/page-streak/PageStreakRunView.tsx
import { Button } from '@/components/common/Button';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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

interface BuildState {
  /** The page and attempt this build was made for. */
  key: string;
  selected: string[];
  confirmed: boolean;
}

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
  // The page the preview tab was opened on, so moving to the next page drops back to the current page tab.
  const [previewPageKey, setPreviewPageKey] = useState('');
  const [build, setBuild] = useState<BuildState>({ key: '', selected: [], confirmed: false });
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  // What the last reported result was. A ref, so reporting it does not re-render the page that is still on screen.
  const lastResultRef = useRef<'win' | 'loss'>('win');
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

  // A new page (or a new attempt) always starts from an empty, unconfirmed build. Derived while rendering rather than
  // reset in an effect, so the old build never shows for a frame on the new page.
  const buildKey = run ? `${run.attempt}-${run.current_page}-${run.status}` : '';
  const { selected, confirmed } = build.key === buildKey ? build : { selected: [] as string[], confirmed: false };

  useCelebrateOnRise(run?.status === 'completed', celebrate);

  // Fixed when the page changes, so the page that is leaving never replays an animation while the result is in flight.
  const pageKey = run ? `${run.attempt}-${run.current_page}` : '';
  const pageVariant = useMemo(() => (lastResultRef.current === 'loss' ? 'reset' : 'enter'), [pageKey]);

  const currentPagePerks = run ? run.pages[run.current_page - 1] ?? [] : [];
  const buildSize = Math.min(4, currentPagePerks.length);
  const nextPagePerks = run && run.current_page < run.page_count ? run.pages[run.current_page] : [];
  const viewingNext = nextPagePerks.length > 0 && previewPageKey === pageKey;

  const toggle = (name: string) => {
    if (selected.includes(name)) setBuild({ key: buildKey, selected: selected.filter((n) => n !== name), confirmed });
    else if (selected.length < buildSize) setBuild({ key: buildKey, selected: [...selected, name], confirmed });
  };

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
                        lastResultRef.current = 'loss';
                        submitResult(run.current_page, selected, 'loss');
                      }}
                    >
                      {dict.streaks.loseMatch}
                    </StreakActionButton>
                    <StreakActionButton
                      variant="green"
                      disabled={busy}
                      onClick={() => {
                        lastResultRef.current = 'win';
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
                    onClick={() => setBuild({ key: buildKey, selected, confirmed: true })}
                  >
                    {dict.streaks.confirmBuild}
                  </StreakActionButton>
                )}
              </StreakActionBar>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_25rem]">
                <div>
                  {nextPagePerks.length > 0 && (
                    <div role="tablist" className="mb-3 flex justify-center">
                      <div className="inline-flex rounded-full border border-border-color bg-bg-elevated/40 p-0.5">
                        {[run.current_page, run.current_page + 1].map((page, index) => {
                          const active = (index === 1) === viewingNext;
                          return (
                            <button
                              key={page}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              onClick={() => setPreviewPageKey(index === 1 ? pageKey : '')}
                              className={`rounded-full px-4 py-1 text-tiny uppercase tracking-widest transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red motion-reduce:transition-none ${
                                active
                                  ? 'bg-bg-surface text-text-primary shadow-sm'
                                  : 'text-text-muted hover:text-accent-red'
                              }`}
                            >
                              {dict.streaks.pageLabel} {page}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {viewingNext ? (
                    <PerkPageGrid key={`${pageKey}-next`} perks={nextPagePerks} dimmed iconByPerk={iconByPerk} />
                  ) : (
                    <PerkPageGrid
                      key={pageKey}
                      perks={currentPagePerks}
                      selected={selected}
                      onToggle={confirmed ? undefined : toggle}
                      locked={confirmed}
                      variant={pageVariant}
                      iconByPerk={iconByPerk}
                    />
                  )}
                </div>

                <aside className="order-first lg:order-none lg:flex lg:items-center lg:justify-center lg:border-l lg:border-border-color lg:pl-6">
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
            attempts={run.attempts + 1}
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
