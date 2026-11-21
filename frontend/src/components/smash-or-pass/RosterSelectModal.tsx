'use client';
// frontend/src/components/smash-or-pass/RosterSelectModal.tsx

import React from 'react';
import { CardStackIcon, ChevronIcon } from '@/components/icons/DbdIcons';
import type { RosterItem } from '@/types/smashOrPass';
import { Modal } from '@/components/common/Modal';
import { AuthRequiredState } from '@/components/common/AuthRequiredState';
import { useAuth } from '@/context/AuthContext';
import { useDictionary } from "@/context/DictionaryContext";
import { RosterCarouselCard } from './roster-select/RosterCarouselCard';
import { RosterHeaderActions, RosterPickerFooter } from './roster-select/RosterPickerFooter';
import { useRosterCarousel } from './roster-select/useRosterCarousel';

import { Button } from '@/components/common/Button';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { EmptyState } from '@/components/common/EmptyState';
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
    stepPrev,
    stepNext,
    jumpBy,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleClickCapture,
  } = useRosterCarousel({ isOpen, rosters, selectedRosterSlug, onSelectRoster, onClose });

  const selectRosterTitle = dict.smashOrPass.selectRoster;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="full"
      closeButton="floating"
      ariaLabel={selectRosterTitle}
      closeButtonAriaLabel={dict.modal.close}
      backdrop="blur"
      className="h-auto max-h-237.5 sm:h-modal-roster sm:min-h-145 max-w-roster-modal border-2 border-accent-red/35 rounded-card"
      bodyClassName="flex flex-col overflow-hidden"
    >
      <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2.5 sm:gap-0 sm:justify-between overflow-hidden p-3.5 sm:p-6 md:p-8">
        <div className="order-1 text-center pt-0.5 sm:pt-2 sm:pb-2 w-full">
          <h2 className="w-fit mx-auto px-10 xl:px-0 text-lg sm:text-3xl md:text-4xl font-black tracking-spaced-sm sm:tracking-spaced-lg text-text-primary uppercase">
            {selectRosterTitle}
          </h2>
        </div>

        {/* Below xl (mobile, tablet, 1024px): inline bar under carousel [Import | Official/Custom | Delete]; on xl+ (1280px+): toggle top-left, actions under title */}
        <div className="order-3 xl:order-1 flex items-center justify-between xl:justify-center gap-2 w-full xl:pb-3">
          <div className="order-2 xl:order-none relative z-10 xl:z-20 flex justify-center xl:w-auto xl:absolute xl:top-6 xl:left-6">
            <SegmentedControl<'official' | 'custom'>
              ariaLabel={dict.smashOrPass.picker.officialTab}
              size="sm"
              value={filter}
              onChange={handleFilterChange}
              className="bg-bg-elevated/90 backdrop-blur-md"
              options={[
                { value: 'official', label: `${dict.smashOrPass.picker.officialTab} (${officialRosters.length})` },
                { value: 'custom', label: `${dict.smashOrPass.picker.customTab} (${customRosters.length})` },
              ]}
            />
          </div>

          <RosterHeaderActions
            activeRosterInCenter={activeRosterInCenter}
            onCreateRoster={onCreateRoster}
            onImportRoster={onImportRoster}
            onEditRoster={onEditRoster}
            onExportRoster={onExportRoster}
            onDeleteRoster={onDeleteRoster}
            onReportRoster={onReportRoster}
          />
        </div>

        <section
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClickCapture={handleClickCapture}
          className={`order-2 relative w-full h-76 sm:h-auto sm:flex-1 min-h-0 flex items-center justify-center overflow-visible touch-none select-none sm:my-3 [container-type:size] ${N > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
          style={{
            perspective: 1200,
            // Compact width on narrow phones (62% of container) so side cards & arrows stay visible.
            ['--card-w' as string]: 'min(calc((100cqh - 0.5rem) / 1.06 * 0.685), calc(100cqw * 0.62))',
            ['--card-h' as string]: 'calc(var(--card-w) / 0.685)',
          }}
          aria-label={selectRosterTitle}
        >
          {N > 1 && (
            <>
              <Button
                type="button"
                aria-label={dict.pagination.previous}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={stepPrev}
                variant="soft" size="lg" icon pill className="absolute left-2 z-50 sm:left-4 sm:h-14 sm:w-14 md:left-8 hover:scale-110 active:scale-95"
              >
                <ChevronIcon className="icon-xl sm:h-7 sm:w-7 rotate-180" aria-hidden="true" />
              </Button>

              <Button
                type="button"
                aria-label={dict.pagination.next}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={stepNext}
                variant="soft" size="lg" icon pill className="absolute right-2 z-50 sm:right-4 sm:h-14 sm:w-14 md:right-8 hover:scale-110 active:scale-95"
              >
                <ChevronIcon className="icon-xl sm:h-7 sm:w-7" aria-hidden="true" />
              </Button>
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
            <div className="relative z-10 mx-auto max-w-md">
              <EmptyState
                variant="compact"
                icon={CardStackIcon}
                iconClassName="mx-auto mb-2 h-10 w-10 text-accent-red animate-pulse"
                title={filter === 'custom' ? dict.smashOrPass.picker.noCustomRostersFound : dict.smashOrPass.picker.noRostersFound}
                subtitle={filter === 'custom' ? dict.smashOrPass.picker.noCustomRostersDesc : dict.smashOrPass.picker.noRostersMatchDesc}
              />
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
        </section>

        <div className="order-4 text-center pt-2 pb-1 space-y-2 sm:space-y-3">
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
