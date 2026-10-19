'use client';
// frontend/src/components/tier-lists/TierListHub.tsx

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/common/Alert';
import { FileJson, LayoutList, Plus, RotateCcw, TriangleAlert } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { AuthRequiredState } from '@/components/common/AuthRequiredState';
import { useAuth } from '@/context/AuthContext';
import { useSignInThen } from '@/hooks/useSignInThen';
import type { TierListDocument } from '@/types/tierList';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import { useTierListStore } from '@/hooks/useTierListStore';
import { useTierListSummaries } from '@/hooks/useTierListTemplates';
import { readShareFragment } from '@/utils/tierLists/codec';
import { createCustomListId, deleteCustomList, saveCustomList, saveRanking, type SaveResult } from '@/utils/tierLists/storage';
import { CustomTierListCard, OfficialTierListCard } from './TierListCards';
import { TierListImportModal } from './TierListImportModal';
import { TierListSkeleton } from './TierListSkeleton';
import { HEADER_BTN } from './styles';
import { Button } from '@/components/common/Button';
import { useDictionary } from "@/context/DictionaryContext";
import { Badge } from '@/components/common/Badge';
import { AccordionSection } from '@/components/common/AccordionSection';
import { Switch } from '@/components/common/Switch';
import { useGlobalNsfwPreference, hasSeenNsfwOnboarding } from '@/utils/nsfwAck';

const NsfwOnboardingModal = dynamic(
  () => import('@/components/common/NsfwOnboardingModal').then((m) => m.NsfwOnboardingModal),
  { ssr: false }
);
const AuthModal = dynamic(() => import('@/components/AuthModal').then((m) => m.AuthModal), { ssr: false });

interface TierListHubProps {
  locale: string;
}

// Capped ranges: an open-ended xl: rule would shadow wide: (px breakpoints are emitted first).
const GRID = 'grid grid-cols-1 gap-3 sm:gap-4 sm:max-xl:grid-cols-2 xl:max-wide:grid-cols-3 wide:grid-cols-4';

export function TierListHub({ locale }: TierListHubProps) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const signIn = useSignInThen();
  const { lists, loading, error, refresh } = useTierListSummaries(locale);
  const { state, hydrated } = useTierListStore();
  const [importOpen, setImportOpen] = useState<boolean>(false);
  const [sharePayload, setSharePayload] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<SaveResult | null>(null);
  const [listToDelete, setListToDelete] = useState<{ id: string; title: string } | null>(null);

  const [isOfficialOpen, toggleOfficial] = usePersistentDrawer('lemondbd_drawer_tier_lists_official', true);
  const [isCustomOpen, toggleCustom] = usePersistentDrawer('lemondbd_drawer_tier_lists_custom', true);
  const [showNsfw, setShowNsfw] = useGlobalNsfwPreference();
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!hasSeenNsfwOnboarding()) {
      setOnboardingOpen(true);
    }
  }, []);

  // A share link lands here as `/tier-lists#import=...`. Read it once, then
  // strip it from the address bar so a reload does not re-open the dialog.
  useEffect(() => {
    // Wait for /auth/me: before it answers a signed-in visitor still reads as signed out, and the
    // sign-in window would open on top of the import dialog that follows a moment later.
    if (authLoading) return;
    const consume = () => {
      const payload = readShareFragment(window.location.hash);
      if (!payload) return;
      if (!isAuthenticated) {
        setIsAuthModalOpen(true);
        return;
      }
      setSharePayload(payload);
      setImportOpen(true);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    };
    consume();
    window.addEventListener('hashchange', consume);
    return () => window.removeEventListener('hashchange', consume);
  }, [isAuthenticated, authLoading]);

  const templates = useMemo(() => Object.fromEntries(lists.map((l) => [l.slug, l.title])), [lists]);

  const customLists = useMemo(
    () => Object.values(state.custom).sort((a, b) => b.updatedAt - a.updatedAt),
    [state.custom]
  );

  const customCount = hydrated ? customLists.length : 0;

  const rankedCount = useCallback(
    (slug: string) =>
      Object.values(state.rankings[slug]?.placements ?? {}).reduce((n, keys) => n + keys.length, 0),
    [state.rankings]
  );

  // The creator page builds the list (title, ladder, items) before anything is saved.
  const createBlank = () => signIn.run(() => router.push(`/${locale}/tier-lists/new`));

  const handleOpenImport = () => signIn.run(() => setImportOpen(true));

  const handleImport = (doc: TierListDocument) => {
    setImportOpen(false);
    setSharePayload(null);
    if (doc.template) {
      const result = saveRanking(doc.template, { tiers: doc.tiers, placements: doc.placements });
      if (!result.ok) setSaveError(result);
      router.push(`/${locale}/tier-lists/${doc.template}`);
      return;
    }
    const id = createCustomListId();
    const result = saveCustomList({
      id,
      title: doc.title,
      description: doc.description ?? '',
      tiers: doc.tiers,
      items: doc.items ?? [],
      placements: doc.placements,
      createdAt: Date.now(),
      ...(doc.backgroundImage ? { backgroundImage: doc.backgroundImage } : {}),
      ...(doc.is_nsfw ? { is_nsfw: true } : {}),
      ...(doc._manifest ? { _manifest: doc._manifest } : {}),
    });
    if (!result.ok) setSaveError(result);
    router.push(`/${locale}/tier-lists/custom/${id}`);
  };

  return (
    <div className="relative z-10 flex flex-col gap-8">
      <h1 className="sr-only">{t.pageTitle}</h1>
      {saveError && !saveError.ok && (
        <Alert>{saveError.reason === 'quota' ? t.saveFailedQuota : t.saveFailedUnavailable}</Alert>
      )}

      {/* Official Lists Collapsible Drawer */}
      <AccordionSection
        titleId="tier-lists-official"
        title={t.officialSection}
        open={isOfficialOpen}
        onToggle={toggleOfficial}
        banner="/images/banners/banner_loadouts.webp"
        badge={lists.length > 0 && (<Badge tone="red" size="sm" plain>{lists.length}</Badge>)}
        headerAction={
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted hidden sm:inline">{t.nsfw.toggle}</span>
            <Switch checked={showNsfw} onChange={setShowNsfw} ariaLabel={t.nsfw.toggle} size="sm" />
          </div>
        }
        as="section"
        bodyClassName="p-4 sm:p-6"
      >
        {loading && !error ? (
          <TierListSkeleton className="min-h-60" />
        ) : error && lists.length === 0 ? (
          <EmptyState
            icon={TriangleAlert}
            title={t.loadError}
            subtitle={t.loadErrorSubtitle}
            action={{
              label: (
                <>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.retry}
                </>
              ),
              onClick: () => void refresh(),
            }}
          />
        ) : lists.length === 0 ? (
          <EmptyState icon={LayoutList} title={t.noOfficialLists} subtitle={t.noOfficialListsSubtitle} />
        ) : (
          <div className={GRID}>
            {lists.map((list) => (
              <OfficialTierListCard
                key={list.slug}
                list={list}
                rankedCount={hydrated ? rankedCount(list.slug) : 0}
                locale={locale}
                showNsfw={showNsfw}
                onRevealNsfw={() => setShowNsfw(true)}
              />
            ))}
          </div>
        )}
      </AccordionSection>
      {/* My custom lists: the header stays pinned while the lists scroll (stickyHeader). */}
      <AccordionSection
        titleId="tier-lists-custom"
        title={t.mySection}
        open={isCustomOpen}
        onToggle={toggleCustom}
        banner="/images/banners/banner_account.webp"
        badge={hydrated && (<Badge tone="red" size="sm" plain>{customCount}</Badge>)}
        headerAction={<div className="flex items-center gap-2"><Button variant="secondary" onClick={handleOpenImport} className={HEADER_BTN}><FileJson className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="hidden sm:inline">{t.importJson}</span></Button><Button variant="primary" onClick={createBlank} className={HEADER_BTN}><Plus className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="hidden sm:inline">{t.newCustomList}</span></Button></div>}
        stickyHeader
        as="section"
        bodyClassName="p-4 sm:p-6"
      >
        {!isAuthenticated ? (
          <AuthRequiredState
            variant="compact"
            title={t.loginToManage}
            subtitle={t.loginToManageDesc}
          />
        ) : hydrated && customLists.length === 0 ? (
          <EmptyState
            title={t.noCustomLists}
            subtitle={t.noCustomListsSubtitle}
          />
        ) : (
          <div className={GRID}>
            {customLists.map((list) => (
              <CustomTierListCard
                key={list.id}
                list={list}
                locale={locale}
                onDelete={(id, title) => setListToDelete({ id, title })}
                showNsfw={showNsfw}
                onRevealNsfw={() => setShowNsfw(true)}
              />
            ))}
          </div>
        )}
      </AccordionSection>

      <ConfirmModal
        open={Boolean(listToDelete)}
        onCancel={() => setListToDelete(null)}
        title={t.deleteListTitle}
        message={
          listToDelete
            ? `${listToDelete.title ? `"${listToDelete.title}": ` : ''}${t.deleteListMessage}`
            : undefined
        }
        confirmLabel={t.deleteList}
        cancelLabel={t.cancel}
        onConfirm={() => {
          if (listToDelete) {
            deleteCustomList(listToDelete.id);
            setListToDelete(null);
          }
        }}
      />

      <TierListImportModal
        open={importOpen}
        target={{ kind: 'hub', templates }}
        sharePayload={sharePayload}
        onClose={() => {
          setImportOpen(false);
          setSharePayload(null);
        }}
        onImport={handleImport}
      />

      {(isAuthModalOpen || signIn.isAuthModalOpen) && (
        <AuthModal
          isOpen
          onClose={() => {
            setIsAuthModalOpen(false);
            signIn.closeAuthModal();
          }}
        />
      )}

      <NsfwOnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />
    </div>
  );
}
