'use client';
// frontend/src/components/smash-or-pass/hub/RosterModals.tsx
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { useAuth } from '@/context/AuthContext';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import { deleteCustomRoster } from '@/utils/smashOrPass/storage';
import { ReportContentModal } from '@/components/common/ReportContentModal';
import { RosterSelectModal, SmashRosterExportModal, SmashRosterImportModal } from './lazyParts';
import type { useHubOverlays } from './useHubOverlays';
import type { useSmashRosters } from './useSmashRosters';

const AuthModal = dynamic(() => import('@/components/AuthModal').then((m) => m.AuthModal), { ssr: false });

interface RosterModalsProps {
  locale: string;
  overlays: ReturnType<typeof useHubOverlays>;
  rosters: ReturnType<typeof useSmashRosters>;
}

/** Everything about choosing, creating, importing, exporting and deleting rosters. */
export function RosterModals({ locale, overlays, rosters }: RosterModalsProps) {
  const dict = useDictionary();
  const router = useRouter();
  const {
    isRosterModalOpen,
    setIsRosterModalOpen,
    rosterPendingDelete,
    setRosterPendingDelete,
    isImportModalOpen,
    setIsImportModalOpen,
    exportingRosterId,
    setExportingRosterId,
  } = overlays;
  const { isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [reportingRosterId, setReportingRosterId] = useState<string | null>(null);
  const { allRosters, selectedRosterSlug, customRosterStore, rosterSwitchEffect, getRosterDisplayName, pickRoster, selectRoster } =
    rosters;

  const confirmDelete = () => {
    if (!rosterPendingDelete) return;
    const id = rosterPendingDelete.id;
    deleteCustomRoster(id);
    if (selectedRosterSlug === `local:${id}`) pickRoster('canon');
    setRosterPendingDelete(null);
  };

  const exportingDoc = (() => {
    const roster = exportingRosterId ? customRosterStore.custom[exportingRosterId] : undefined;
    if (!roster) return null;
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...doc } = roster;
    return doc;
  })();

  const reportingRoster = reportingRosterId ? customRosterStore.custom[reportingRosterId] : undefined;
  const reportingDoc = reportingRoster
    ? (({ id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...doc }) => doc)(reportingRoster)
    : {};

  return (
    <>
      <RosterSelectModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        rosters={allRosters}
        selectedRosterSlug={selectedRosterSlug}
        onSelectRoster={selectRoster}
        onCreateRoster={() => {
          if (!isAuthenticated) {
            setIsAuthModalOpen(true);
            return;
          }
          setIsRosterModalOpen(false);
          router.push(`/${locale}/smash-or-pass/create`);
        }}
        onImportRoster={() => {
          if (!isAuthenticated) {
            setIsAuthModalOpen(true);
            return;
          }
          setIsRosterModalOpen(false);
          setIsImportModalOpen(true);
        }}
        onEditRoster={(id) => {
          if (!isAuthenticated) {
            setIsAuthModalOpen(true);
            return;
          }
          setIsRosterModalOpen(false);
          router.push(`/${locale}/smash-or-pass/create?edit=${id}`);
        }}
        onDeleteRoster={(id) => {
          const roster = customRosterStore.custom[id];
          setRosterPendingDelete({ id, name: roster?.name || 'Untitled Roster' });
        }}
        // Unlike Edit/Create (which navigate away), Export is just an overlay -- the picker stays
        // open underneath it, same as the delete confirmation, so closing it returns to the picker.
        onExportRoster={setExportingRosterId}
        onReportRoster={setReportingRosterId}
        locale={locale}
      />

      {/* DELETE CUSTOM ROSTER CONFIRMATION */}
      {rosterPendingDelete && (
        <Modal
          isOpen
          onClose={() => setRosterPendingDelete(null)}
          variant="confirm"
          layer="top"
          title={dict.smashOrPass.picker.deleteConfirmTitle}
          closeButtonAriaLabel={dict.modal.close}
          bodyClassName="p-5 text-center"
          footerClassName="p-4"
          footer={
            <div className="flex w-full flex-col-reverse gap-2.5 sm:flex-row">
              <Button variant="secondary" size="md" onClick={() => setRosterPendingDelete(null)} className="flex-1 rounded-xl">
                {dict.smashOrPass.modals.cancel}
              </Button>
              <Button variant="primary" size="md" onClick={confirmDelete} className="flex-1 rounded-xl">
                {dict.smashOrPass.picker.deleteConfirmAction}
              </Button>
            </div>
          }
        >
          <p className="type-body text-text-muted">
            {formatMessage(dict.smashOrPass.picker.deleteConfirmDesc, { name: rosterPendingDelete.name })}
          </p>
        </Modal>
      )}

      <SmashRosterImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImported={(slug) => {
          setIsImportModalOpen(false);
          pickRoster(slug);
        }}
      />

      {exportingRosterId && (
        <SmashRosterExportModal doc={exportingDoc} onClose={() => setExportingRosterId(null)} locale={locale} />
      )}

      <ReportContentModal
        isOpen={Boolean(reportingRosterId)}
        onClose={() => setReportingRosterId(null)}
        contentType="smash_roster"
        manifest={reportingRoster?._manifest ?? null}
        payload={reportingDoc as unknown as Record<string, unknown>}
        contentTitle={reportingRoster?.name}
      />

      {/* ROSTER SWITCH STARTING ANIMATION EFFECT */}
      {rosterSwitchEffect && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-accent-red/15 backdrop-blur-sm animate-pulse" />
          <div className="relative flex flex-col items-center gap-2 p-6 rounded-3xl bg-bg-primary/90 border-2 border-accent-red text-center animate-in zoom-in-75 duration-300">
            <Heart className="h-14 w-14 text-accent-red fill-accent-red animate-bounce" />
            <span className="text-xl font-black tracking-widest text-text-primary uppercase">
              {getRosterDisplayName({ slug: rosterSwitchEffect })}
            </span>
          </div>
        </div>
      )}

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}
    </>
  );
}
