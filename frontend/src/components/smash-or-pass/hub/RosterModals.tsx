'use client';
import { HeartIcon } from '@/components/icons/DbdIcons';
// frontend/src/components/smash-or-pass/hub/RosterModals.tsx
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Toast } from '@/components/common/Toast';
import { useSignInThen } from '@/hooks/useSignInThen';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import { signingPayload } from '@/utils/contentPayload';
import { smashRosterExportDoc } from '@/utils/smashOrPass/exportDoc';
import { deleteCustomRoster } from '@/utils/smashOrPass/storage';
import { ReportContentModal } from '@/components/common/ReportContentModal';
import { useOptionalAuth } from '@/context/AuthContext';
import { apiUrl, authHeaders } from '@/utils/api';
import { RosterSelectModal, SmashRosterExportModal, SmashRosterImportModal } from './lazyParts';
import type { useHubOverlays } from './useHubOverlays';
import type { useSmashRosters } from './useSmashRosters';

const AuthModal = dynamic(() => import('@/components/AuthModal').then((m) => m.AuthModal), { ssr: false });

/** The roster editor: blank for a new roster, or the one with this id. */
const editorPath = (locale: string, editId?: string) =>
  `/${locale}/smash-or-pass/create${editId ? `?edit=${editId}` : ''}`;

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
  // Signing in from the picker carries on with what was asked: the editor, the import window...
  const signIn = useSignInThen();
  const auth = useOptionalAuth();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isAdmin = Boolean(auth?.user?.role === 'admin');
  const [reportingRosterId, setReportingRosterId] = useState<string | null>(null);
  const { allRosters, selectedRosterSlug, customRosterStore, rosterSwitchEffect, getRosterDisplayName, pickRoster, selectRoster } =
    rosters;

  const openEditor = (idOrSlug?: string) => {
    setIsRosterModalOpen(false);
    const isOfficial = Boolean(idOrSlug && !customRosterStore.custom[idOrSlug] && allRosters.some((r) => r.slug === idOrSlug && !r.is_local));
    if (isOfficial) {
      router.push(`/${locale}/smash-or-pass/create?official=${idOrSlug}`);
    } else {
      router.push(editorPath(locale, idOrSlug));
    }
  };
  const openImport = () => {
    setIsRosterModalOpen(false);
    setIsImportModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!rosterPendingDelete) return;
    const { id, isOfficial } = rosterPendingDelete;
    if (isOfficial) {
      try {
        const res = await fetch(apiUrl(`/api/v1/smash-or-pass/admin/rosters/${id}`), {
          method: 'DELETE',
          headers: authHeaders(),
        });
        if (res.ok) {
          if (selectedRosterSlug === id) pickRoster('canon');
          window.location.reload();
        } else {
          const err = await res.json().catch(() => ({}));
          setDeleteError(err?.error || err?.message || 'Failed to delete roster');
        }
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : 'Network error');
      }
    } else {
      deleteCustomRoster(id);
      if (selectedRosterSlug === `local:${id}`) pickRoster('canon');
    }
    setRosterPendingDelete(null);
  };

  const exportingRoster = exportingRosterId ? customRosterStore.custom[exportingRosterId] : undefined;
  const exportingDoc = exportingRoster ? smashRosterExportDoc(exportingRoster) : null;

  const reportingRoster = reportingRosterId ? customRosterStore.custom[reportingRosterId] : undefined;
  const reportingDoc = reportingRoster ? smashRosterExportDoc(reportingRoster) : {};

  return (
    <>
      {deleteError && (
        <Toast
          tone="red"
          message={deleteError}
          onDismiss={() => setDeleteError(null)}
          dismissLabel={dict.smashOrPass.creator.closeToast}
        />
      )}
      <RosterSelectModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        rosters={allRosters}
        selectedRosterSlug={selectedRosterSlug}
        onSelectRoster={selectRoster}
        onCreateRoster={() => signIn.run(() => openEditor())}
        onImportRoster={() => signIn.run(openImport)}
        onEditRoster={(id) => signIn.run(() => openEditor(id))}
        onDeleteRoster={(idOrSlug) => {
          const customRoster = customRosterStore.custom[idOrSlug];
          if (customRoster) {
            setRosterPendingDelete({ id: idOrSlug, name: customRoster?.name || 'Untitled Roster', isOfficial: false });
          } else {
            const officialRoster = allRosters.find((r) => r.slug === idOrSlug && !r.is_local);
            if (officialRoster && isAdmin) {
              setRosterPendingDelete({ id: idOrSlug, name: officialRoster.name, isOfficial: true });
            }
          }
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
            <div className="flex w-full justify-center">
              <Button variant="danger" size="md" onClick={() => { void confirmDelete(); }} className="w-full sm:w-auto sm:min-w-36">
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
        payload={signingPayload('smash_roster', reportingDoc)}
        contentTitle={reportingRoster?.name}
      />

      {/* ROSTER SWITCH STARTING ANIMATION EFFECT */}
      {rosterSwitchEffect && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-accent-red/15 backdrop-blur-sm animate-pulse" />
          <div className="relative flex flex-col items-center gap-2 p-6 rounded-card bg-bg-primary/90 border-2 border-accent-red text-center animate-in zoom-in-75 duration-300">
            <HeartIcon className="h-14 w-14 text-accent-red fill-accent-red animate-bounce" />
            <span className="text-xl font-black tracking-widest text-text-primary uppercase">
              {getRosterDisplayName(allRosters.find((r) => r.slug === rosterSwitchEffect) ?? { slug: rosterSwitchEffect })}
            </span>
          </div>
        </div>
      )}

      {signIn.isAuthModalOpen && <AuthModal isOpen onClose={signIn.closeAuthModal} />}
    </>
  );
}
