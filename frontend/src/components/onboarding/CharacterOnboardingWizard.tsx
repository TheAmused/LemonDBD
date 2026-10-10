'use client';
// frontend/src/components/onboarding/CharacterOnboardingWizard.tsx
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDictionary } from '@/context/DictionaryContext';
import { PerksTogglePopup } from '@/components/characters/PerksTogglePopup';
import { SkipOnboardingModal } from '@/components/onboarding/SkipOnboardingModal';
import { Spinner } from '@/components/common/Spinner';
import { Button } from '@/components/common/Button';
import {
  type OnboardingCharacter,
  type OnboardingPerk,
  isDefaultUnlockedPerk,
  slugifyChapterName,
} from './CharacterOnboardingWizardParts';
import { ChapterCard } from './wizard/ChapterCard';
import { ChapterCharacterPanel } from './wizard/ChapterCharacterPanel';
import { ChapterToolbar } from './wizard/ChapterToolbar';
import { OnboardingAuthRequired } from './wizard/OnboardingAuthRequired';
import { OnboardingIntroView } from './wizard/OnboardingIntroView';
import { OnboardingLanguageView } from './wizard/OnboardingLanguageView';
import { OnboardingLegend } from './wizard/OnboardingLegend';
import { useChapterExpansion } from './wizard/useChapterExpansion';
import { useOnboardingCompletion } from './wizard/useOnboardingCompletion';
import { useOnboardingLanguage } from './wizard/useOnboardingLanguage';
import { useOnboardingRoster } from './wizard/useOnboardingRoster';

export type { ChapterBanner } from './wizard/useOnboardingRoster';

export interface CharacterOnboardingWizardProps {
  locale: string;
  onFinished: () => void;
}

export const CharacterOnboardingWizard: React.FC<CharacterOnboardingWizardProps> = ({ locale, onFinished }) => {
  const dict = useDictionary();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const t = dict.onboarding;

  const roster = useOnboardingRoster(locale);
  const {
    backendBase, characters, allPerks, ownershipDraft, perkUnlockDraft, loading,
    chapterBanners, translatedChapterNames, searchQuery, setSearchQuery,
    chapterGroups, filteredChapterGroups, ownedChaptersCount, isCharacterOwned,
    isAllOwned, hasAnySelection, legendCharacter,
    setCharacterOwned, toggleChapter, handleDeselectAllChapters, handleToggleAllChapters,
    togglePerkUnlocked, getCharacterPerkStats,
  } = roster;
  const language = useOnboardingLanguage(locale);
  const {
    expandedChapter, renderedGroup, chapterRowEndIndex,
    toggleChapterExpanded, handleChapterPanelExitComplete,
  } = useChapterExpansion(filteredChapterGroups);
  const { saving, handleContinue, handleSkipConfirm } = useOnboardingCompletion({
    backendBase, characters, allPerks, ownershipDraft, perkUnlockDraft, onFinished,
  });

  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [perksPopupCharacter, setPerksPopupCharacter] = useState<OnboardingCharacter | null>(null);

  // Auth finished resolving and there's no session -- the roster fetch never
  // runs without a user/token, so this must render something other than the
  // loading spinner below.
  if (!authLoading && !isAuthenticated) {
    return <OnboardingAuthRequired locale={locale} />;
  }

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" tone="accent" />
      </div>
    );
  }

  if (language.view === 'intro') {
    return <OnboardingIntroView onContinue={() => language.setView('language')} />;
  }

  if (language.view === 'language') {
    return (
      <OnboardingLanguageView
        selectedLanguage={language.selectedLanguage}
        savingLanguage={language.savingLanguage}
        onSelect={language.handleLanguageSelect}
        onContinue={language.handleLanguageContinue}
      />
    );
  }

  return (
    <div className="min-h-screen p-2.5 sm:p-5 lg:p-6 pb-32 sm:pb-36 lg:pb-36">
      <div className="mx-auto w-full max-w-[96rem] 2xl:max-w-[110rem] 3xl:max-w-[124rem]">
        {/* Unified Card Container */}
        <div className="rounded-2xl border border-border-color bg-bg-surface p-3 sm:p-5 lg:p-6 shadow-2xl space-y-3.5 sm:space-y-4">
          {/* Header Section */}
          <header className="relative flex flex-col items-center text-center space-y-1.5 sm:space-y-2">
            <div className="sm:absolute sm:right-0 sm:top-0 hidden sm:block">
              <button
                type="button"
                onClick={() => setIsSkipModalOpen(true)}
                className="shrink-0 rounded-xl border border-accent-amber/50 bg-accent-amber/10 px-4 py-2 sm:px-5 sm:py-2.5 lg:px-6 lg:py-3 text-xs sm:text-sm lg:text-base font-bold text-accent-amber hover:bg-accent-amber/20 hover:border-accent-amber transition-all cursor-pointer shadow-xs"
              >
                {t.skipButton}
              </button>
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-text-primary px-2">
              {t.heading}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto px-2">
              {t.subheading}
            </p>
            <div className="sm:hidden pt-0.5">
              <button
                type="button"
                onClick={() => setIsSkipModalOpen(true)}
                className="shrink-0 rounded-xl border border-accent-amber/50 bg-accent-amber/10 px-3 py-1 type-strong text-accent-amber hover:bg-accent-amber/20 transition-colors cursor-pointer"
              >
                {t.skipButton}
              </button>
            </div>
          </header>

          <hr className="border-t border-border-color/60 mt-0.5 mb-3 sm:mb-5 lg:mb-6" />

          <OnboardingLegend legendCharacter={legendCharacter} backendBase={backendBase} />

          <hr className="border-t border-border-color/60 mt-0.5 mb-2.5 sm:mb-3.5" />

          {/* DLC / Chapters Section */}
          <section className="space-y-3">
            <ChapterToolbar
              ownedChaptersCount={ownedChaptersCount}
              chapterCount={chapterGroups.length}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isAllOwned={isAllOwned}
              hasAnySelection={hasAnySelection}
              onToggleAll={handleToggleAllChapters}
              onDeselectAll={handleDeselectAllChapters}
            />

            <p className="flex items-start gap-1.5 text-tiny sm:text-mini text-text-secondary">
              <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 mt-0.5" />
              <span>
                {t.legendCustomizeHint}
              </span>
            </p>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 md:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {filteredChapterGroups.map((group, index) => (
                <React.Fragment key={group.chapterName}>
                  <ChapterCard
                    group={group}
                    isExpanded={expandedChapter === group.chapterName}
                    chapterBanners={chapterBanners}
                    translatedChapterNames={translatedChapterNames}
                    backendBase={backendBase}
                    isCharacterOwned={isCharacterOwned}
                    getCharacterPerkStats={getCharacterPerkStats}
                    toggleChapterExpanded={toggleChapterExpanded}
                    toggleChapter={toggleChapter}
                  />

                  {/* Placed after the last card of the *row*, not right after
                      whichever card was clicked -- otherwise the other cards
                      sharing that row have nowhere to go but a new row of
                      their own, which reads as unrelated cards randomly
                      jumping instead of the row smoothly growing beneath
                      itself. Wrapping div only mounts for as long as a chapter
                      in this row is expanding/expanded/collapsing
                      (`renderedGroup`); AnimatePresence/motion.div do the
                      actual measured-height enter/exit animation. */}
                  {index === chapterRowEndIndex && renderedGroup && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      {/* No initial={false} here on purpose -- unlike a
                          persistently-mounted AnimatePresence, this one is
                          conditionally rendered (mounts exactly when a chapter
                          in this row starts expanding), so initial={false}
                          would skip the enter animation on every single open,
                          not just on page load. */}
                      <AnimatePresence onExitComplete={handleChapterPanelExitComplete}>
                        {expandedChapter === renderedGroup.chapterName && (
                          <motion.div
                            key={`chapter-panel-${slugifyChapterName(renderedGroup.chapterName)}`}
                            id={`chapter-panel-${slugifyChapterName(renderedGroup.chapterName)}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <ChapterCharacterPanel
                              group={renderedGroup}
                              backendBase={backendBase}
                              isCharacterOwned={isCharacterOwned}
                              getCharacterPerkStats={getCharacterPerkStats}
                              setCharacterOwned={setCharacterOwned}
                              onOpenPerks={setPerksPopupCharacter}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </section>

          <div className="h-4" />
        </div>
      </div>

      {/* Sticky full-screen bottom continue banner so Continue stays reachable while scrolling */}
      <div className="fixed bottom-0 inset-x-0 z-30 w-full border-t border-border-color bg-bg-surface/95 backdrop-blur-md shadow-2xl">
        <div className="mx-auto flex w-full max-w-7xl justify-center px-4 py-3 sm:py-4">
          <Button variant="primary" disabled={saving} onClick={handleContinue} className="w-full max-w-sm sm:max-w-md">
            {saving ? t.savingLabel : t.continueButton}
          </Button>
        </div>
      </div>

      <PerksTogglePopup
        character={perksPopupCharacter}
        perks={allPerks}
        isPerkUnlocked={(perkId) => perkUnlockDraft[perkId] ?? true}
        isPerkLockedAlways={(p) => isDefaultUnlockedPerk(p as OnboardingPerk, characters)}
        onTogglePerk={togglePerkUnlocked}
        onClose={() => setPerksPopupCharacter(null)}
        backendBase={backendBase}
        perksLabel={t.perksButton}
      />

      <SkipOnboardingModal
        isOpen={isSkipModalOpen}
        onCancel={() => setIsSkipModalOpen(false)}
        onConfirm={handleSkipConfirm}
      />
    </div>
  );
};

export { resolveOnboardingView, isDefaultUnlockedPerk, groupCharactersByChapter, normalizeChapterKey } from "./CharacterOnboardingWizardParts";
export type { OnboardingCharacter, OnboardingPerk, ChapterGroup } from "./CharacterOnboardingWizardParts";
