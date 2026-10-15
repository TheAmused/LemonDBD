'use client';
// frontend/src/components/tier-lists/TierListHub.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ChevronDown, FileJson, LayoutList, Plus, RotateCcw, TriangleAlert } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { AuthRequiredState } from '@/components/common/AuthRequiredState';
import { useAuth } from '@/context/AuthContext';
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
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";
import { Badge } from '@/components/common/Badge';

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
  const { isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const { lists, loading, error, refresh } = useTierListSummaries(locale);
  const { state, hydrated } = useTierListStore();
  const [importOpen, setImportOpen] = useState<boolean>(false);
  const [sharePayload, setSharePayload] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<SaveResult | null>(null);
  const [listToDelete, setListToDelete] = useState<{ id: string; title: string } | null>(null);

  const [isOfficialOpen, toggleOfficial] = usePersistentDrawer('lemondbd_drawer_tier_lists_official', true);
  const [isCustomOpen, toggleCustom] = usePersistentDrawer('lemondbd_drawer_tier_lists_custom', true);

  // A share link lands here as `/tier-lists#import=...`. Read it once, then
  // strip it from the address bar so a reload does not re-open the dialog.
  useEffect(() => {
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
  }, [isAuthenticated]);

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
  const createBlank = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    router.push(`/${locale}/tier-lists/new`);
  };

  const handleOpenImport = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    setImportOpen(true);
  };

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
        <p role="alert" className="flex items-start gap-2 rounded-card border border-accent-red/40 bg-accent-red/10 p-3 type-card-title text-accent-red">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {saveError.reason === 'quota' ? t.saveFailedQuota : t.saveFailedUnavailable}
        </p>
      )}

      {/* Official Lists Collapsible Drawer */}
      <section
        aria-labelledby="tier-lists-official"
        className="rounded-card border border-border-color bg-bg-surface backdrop-blur-xl shadow-md overflow-hidden transition-colors flex flex-col"
      >
        <button
          type="button"
          onClick={toggleOfficial}
          aria-expanded={isOfficialOpen}
          className="relative w-full flex items-center justify-between py-4 px-5 sm:py-4.5 sm:px-7 2xl:py-5.5 2xl:px-9 min-h-[64px] sm:min-h-[72px] cursor-pointer group select-none overflow-hidden transition-colors text-left"
        >
          {/* Atmospheric DBD Banner Backdrop */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-15 dark:opacity-25 mix-blend-luminosity filter pointer-events-none group-hover:scale-105 transition-transform duration-700 ease-out"
            style={{ backgroundImage: "url('/images/banners/banner_loadouts.webp')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-bg-surface via-bg-surface/85 to-bg-surface pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-border-color/60 pointer-events-none" />

          <div className="relative z-10 w-8 hidden sm:block pointer-events-none" aria-hidden="true" />
          <div className="relative z-10 flex-1 text-center min-w-0 px-2">
            <div className="inline-flex items-center gap-2">
              <h2 id="tier-lists-official" className="type-section-title text-text-primary group-hover:text-accent-red transition-colors">
                {t.officialSection}
              </h2>
              {lists.length > 0 && (
                <Badge tone="red" size="sm" plain>
                  {lists.length}
                </Badge>
              )}
            </div>
          </div>
          <div className="relative z-10 w-8 flex justify-end">
            <ChevronDown
              className={`h-4 w-4 sm:h-5 sm:w-5 2xl:h-6 2xl:w-6 text-accent-red transition-transform duration-300 ease-in-out ${
                isOfficialOpen ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </div>
        </button>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isOfficialOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="p-4 sm:p-6 border-t border-border-color">
              {loading && !error ? (
                <TierListSkeleton className="min-h-[240px]" />
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
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* My Custom Lists Collapsible Drawer. No `overflow-hidden` here (unlike
          the Official section) -- an `overflow` other than `visible` on an
          ancestor makes IT the reference scroll container for a `position:
          sticky` descendant, and since this section itself never scrolls,
          that would silently stop the header below from sticking at all.
          The header clips its own banner to the card's rounded top corners
          instead (see its own `overflow-hidden`). */}
      <section
        aria-labelledby="tier-lists-custom"
        className="rounded-card border border-border-color bg-bg-surface backdrop-blur-xl shadow-md transition-colors flex flex-col"
      >
        {/* `sticky` (not the plain `relative` the Official section's header
            uses): Import/New-list are the two actions someone actually
            needs while scrolled down through their own lists, so this bar
            stays reachable instead of scrolling away with the rest of the
            card. `top-16` clears the mobile top bar (`Sidebar.tsx`'s own
            `sticky top-0 h-16`); there's nothing to clear on desktop. */}
        {/* Rounds all 4 corners when collapsed (the header is then the
            whole visible card) and just the top 2 when expanded (the body
            below rounds the bottom) -- what the removed section-level
            `overflow-hidden` used to do automatically for whichever part
            happened to be the visual bottom. */}
        <div
          className={`group sticky top-16 z-20 lg:top-0 w-full min-h-[64px] sm:min-h-[72px] overflow-hidden ${
            isCustomOpen ? 'rounded-t-card' : 'rounded-card'
          }`}
        >
          {/* The toggle is a real <button> for a11y, but only covers the
              banner background now -- the visible title/actions row below
              is a sibling, not its child, so the two "New custom list" /
              "Import JSON" buttons in that row can be real, independently
              clickable <button>s without nesting inside this one (which
              HTML forbids and which would otherwise also fire the toggle
              whenever either was clicked). */}
          <button
            type="button"
            onClick={toggleCustom}
            aria-expanded={isCustomOpen}
            aria-label={t.mySection}
            className="absolute inset-0 cursor-pointer group select-none"
          >
            {/* Atmospheric DBD Banner Backdrop */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-15 dark:opacity-25 mix-blend-luminosity filter group-hover:scale-105 transition-transform duration-700 ease-out"
              style={{ backgroundImage: "url('/images/banners/banner_account.webp')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-bg-surface via-bg-surface/85 to-bg-surface" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-border-color/60" />
          </button>

          {/* `pointer-events-none` on the row so a click anywhere on the
              title/badge/subtitle (or the empty space around them) falls
              through to the toggle button underneath, exactly like before
              this was split in two -- `pointer-events-auto` opts the
              actions group back in so it alone stays independently
              clickable. */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 py-4 px-5 sm:py-4.5 sm:px-7 2xl:py-5.5 2xl:px-9 min-h-[64px] sm:min-h-[72px] pointer-events-none">
            <div className="hidden lg:block lg:flex-1 lg:basis-0 pointer-events-none" aria-hidden="true" />
            <div className="flex-1 lg:flex-none text-center min-w-0 px-2">
              <div className="inline-flex items-center justify-center gap-2">
                <h2 id="tier-lists-custom" className="type-section-title text-text-primary group-hover:text-accent-red transition-colors">
                  {t.mySection}
                </h2>
                {hydrated && (
                  <Badge tone="red" size="sm" plain>
                    {customCount}
                  </Badge>
                )}
              </div>
            </div>

            <div className="pointer-events-none flex shrink-0 items-center justify-end gap-2 lg:flex-1 lg:basis-0">
              {/* Same height and corner radius, one line each; the width follows the label, in every language. */}
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={handleOpenImport} className={`pointer-events-auto ${HEADER_BTN}`}>
                  <FileJson className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">{t.importJson}</span>
                </Button>
                <Button variant="primary" onClick={createBlank} className={`pointer-events-auto ${HEADER_BTN}`}>
                  <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">{t.newCustomList}</span>
                </Button>
              </div>
              <ChevronDown
                className={`h-4 w-4 sm:h-5 sm:w-5 2xl:h-6 2xl:w-6 text-accent-red transition-transform duration-300 ease-in-out shrink-0 ${
                  isCustomOpen ? 'rotate-180' : 'rotate-0'
                }`}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isCustomOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="p-4 sm:p-6 border-t border-border-color">
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
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

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

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}
    </div>
  );
}
