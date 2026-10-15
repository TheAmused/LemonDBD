'use client';
// frontend/src/components/smash-or-pass/RosterSelectModal.tsx

import React from 'react';
import { CardStackIcon, ImportScrollIcon, ThornChevronIcon } from '@/components/icons/DbdIcons';
import type { RosterItem } from '@/types/smashOrPass';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/common/Modal';
import { AuthRequiredState } from '@/components/common/AuthRequiredState';
import { useAuth } from '@/context/AuthContext';
import { useDictionary } from "@/context/DictionaryContext";
import { RosterCarouselCard } from './roster-select/RosterCarouselCard';
import { RosterPickerFooter } from './roster-select/RosterPickerFooter';
import { useRosterCarousel } from './roster-select/useRosterCarousel';

interface RosterSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Every pickable roster, official (API) and the viewer's own (localStorage)
   * already merged into one list by the caller -- this component is data-driven
   * and does not care where a roster came from, only whether `is_active` and
   * `is_local` say about it. */
  rosters: RosterItem[];
  selectedRosterSlug: string;
  onSelectRoster: (slug: string) => void;
  /** Opens the roster creator (a fresh draft). */
  onCreateRoster?: () => void;
  /** Opens the "paste JSON / upload / share link" import flow for a custom roster. */
  onImportRoster?: () => void;
  /** Opens the creator pre-filled with this local roster's id for editing. */
  onEditRoster?: (id: string) => void;
  /** Deletes a local roster (after the caller has confirmed with the viewer). */
  onDeleteRoster?: (id: string) => void;
  /** Opens the share-link/JSON export flow for a local roster. */
  onExportRoster?: (id: string) => void;
  /** Opens the content report modal for a local roster. */
  onReportRoster?: (id: string) => void;
  locale?: string;
}

export const RosterSelectModal: React.FC<RosterSelectModalProps> = ({
      isOpen,
      onClose,
      rosters,
      selectedRosterSlug,
      onSelectRoster,
      onCreateRoster,
      onImportRoster,
      onEditRoster,
      onDeleteRoster,
      onExportRoster,
      onReportRoster,
      locale = 'en',
    }) => {
  const dict = useDictionary();
  const { isAuthenticated } = useAuth();
  const {
    filter,
    handleFilterChange,
    officialRosters,
    customRosters,
    N,
    isDragging,
    activeSelectedSlug,
    visibleCards,
    activeRosterInCenter,
    containerRef,
    commitSelection,
    handleClose,
    stepPrev,
    stepNext,
    jumpBy,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useRosterCarousel({ isOpen, rosters, selectedRosterSlug, onSelectRoster, onClose });

  const selectRosterTitle = dict.smashOrPass.selectRoster;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="dialog"
      size="full"
      closeButton="floating"
      ariaLabel={selectRosterTitle}
      closeButtonAriaLabel={dict.modal.close}
      backdrop="blur"
      className="h-[94dvh] max-h-[1100px] min-h-[580px] max-w-[1600px] border-2 border-accent-red/35 rounded-card"
      bodyClassName="flex flex-col overflow-hidden"
    >
      <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-between overflow-hidden p-4 sm:p-6 md:p-8">
        {/* Top Left: Filter Toggle (Official vs Custom) */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50">
          <div className="inline-flex items-center gap-1 p-1 bg-bg-elevated/90 backdrop-blur-md rounded-card border border-border-color shadow-sm">
            <button
              type="button"
              onClick={() => handleFilterChange('official')}
              className={cn(
                'flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-control text-xs font-bold uppercase tracking-wider transition-all cursor-pointer touch-manipulation',
                filter === 'official'
                  ? 'bg-accent-red text-text-inverted shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <span>{dict.smashOrPass.picker.officialTab} ({officialRosters.length})</span>
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange('custom')}
              className={cn(
                'flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-control text-xs font-bold uppercase tracking-wider transition-all cursor-pointer touch-manipulation',
                filter === 'custom'
                  ? 'bg-accent-red text-text-inverted shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <span>{dict.smashOrPass.picker.customTab} ({customRosters.length})</span>
            </button>
          </div>
        </div>

        <div className="text-center pt-1 sm:pt-2 space-y-2.5">
          <h2 className="text-xl sm:text-3xl md:text-4xl font-black tracking-spaced-md sm:tracking-spaced-lg text-text-primary uppercase">
            {selectRosterTitle}
          </h2>

          {(onCreateRoster || onImportRoster) && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
              {onCreateRoster && (
                <button
                  type="button"
                  onClick={onCreateRoster}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-control bg-accent-red/10 border border-accent-red/40 text-accent-red type-label-sm hover:bg-accent-red/20 transition-colors cursor-pointer"
                >
                  {dict.smashOrPass.picker.createRoster}
                </button>
              )}
              {onImportRoster && (
                <button
                  type="button"
                  onClick={onImportRoster}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-control bg-bg-elevated border border-border-color text-text-secondary type-label-sm hover:text-text-primary hover:border-border-subtle transition-colors cursor-pointer"
                >
                  <ImportScrollIcon className="h-4 w-4" aria-hidden="true" />
                  {dict.smashOrPass.picker.importRoster}
                </button>
              )}
            </div>
          )}
        </div>

        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-full flex-1 min-h-0 flex items-center justify-center overflow-visible touch-none select-none cursor-grab active:cursor-grabbing my-2"
          style={{
            perspective: 1200,
            ['--card-h' as string]: 'clamp(340px, calc(94dvh - 330px), 760px)',
            ['--card-w' as string]: 'calc(var(--card-h) * 0.685)',
          }}
          role="region"
          aria-label={selectRosterTitle}
        >
          {N > 0 && (
            <>
              <button
                type="button"
                aria-label={dict.pagination.previous}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={stepPrev}
                className="absolute left-2 sm:left-4 md:left-8 z-50 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-bg-surface border border-accent-red/40 text-accent-red hover:bg-accent-red hover:text-text-inverted hover:border-accent-red hover:scale-110 active:scale-95 transition-all cursor-pointer pointer-events-auto select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
              >
                <ThornChevronIcon className="h-6 w-6 sm:h-7 sm:w-7 rotate-180" aria-hidden="true" />
              </button>

              <button
                type="button"
                aria-label={dict.pagination.next}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={stepNext}
                className="absolute right-2 sm:right-4 md:right-8 z-50 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-bg-surface border border-accent-red/40 text-accent-red hover:bg-accent-red hover:text-text-inverted hover:border-accent-red hover:scale-110 active:scale-95 transition-all cursor-pointer pointer-events-auto select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
              >
                <ThornChevronIcon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
              </button>
            </>
          )}

          {filter === 'custom' && !isAuthenticated ? (
            <div className="relative z-10 max-w-md mx-auto my-auto p-4">
              <AuthRequiredState
                variant="compact"
                title={dict.smashOrPass.loginToManage}
                subtitle={dict.smashOrPass.loginToManageDesc}
              />
            </div>
          ) : N === 0 ? (
            <div className="relative z-10 flex flex-col items-center justify-center gap-3 p-8 rounded-card border border-dashed border-border-color bg-bg-elevated/40 text-center max-w-md mx-auto">
              <CardStackIcon className="h-10 w-10 text-accent-red animate-pulse" aria-hidden="true" />
              <h3 className="text-base font-bold text-text-primary uppercase tracking-wide">
                {filter === 'custom'
                  ? dict.smashOrPass.picker.noCustomRostersFound
                  : dict.smashOrPass.picker.noRostersFound}
              </h3>
              <p className="text-xs text-text-muted">
                {filter === 'custom'
                  ? dict.smashOrPass.picker.noCustomRostersDesc
                  : dict.smashOrPass.picker.noRostersMatchDesc}
              </p>
            </div>
          ) : (
            <div
              className="relative w-full h-full flex items-center justify-center"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {visibleCards.map(({ roster: r, keyId, visualOffset }) => (
                <RosterCarouselCard
                  key={keyId}
                  roster={r}
                  visualOffset={visualOffset}
                  isDragging={isDragging}
                  isCurrentlyActive={r.slug === activeSelectedSlug}
                  onJump={() => jumpBy(visualOffset)}
                  onCommit={() => commitSelection()}
                />
              ))}
            </div>
          )}
        </div>

        <div className="text-center pt-2 pb-1 space-y-2 sm:space-y-3">
          {dict.smashOrPass.dwellHint && (
            <p className="text-xs sm:text-sm md:text-base text-text-muted tracking-wide">
              {dict.smashOrPass.dwellHint}
            </p>
          )}

          {activeRosterInCenter && (
            <RosterPickerFooter
              roster={activeRosterInCenter}
              onCommit={() => commitSelection()}
              onEditRoster={onEditRoster}
              onExportRoster={onExportRoster}
              onDeleteRoster={onDeleteRoster}
              onReportRoster={onReportRoster}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};
