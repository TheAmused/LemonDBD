'use client';
// frontend/src/components/tier-lists/TierListEditor.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Ellipsis,
  Eye,
  EyeOff,
  MousePointerClick,
  Pencil,
  RotateCcw,
  Share2,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import type { TierDefinition, TierItem, TierListDocument, TierPlacements } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { usePersistentString } from '@/hooks/usePersistentString';
import {
  type BoardContainers,
  type LadderState,
  addTier,
  buildBoard,
  clearTier,
  moveTier,
  placementsFromBoard,
  removeTier,
  updateTier,
} from '@/utils/tierLists/board';
import { TIER_COLOR_TOKENS } from '@/utils/tierLists/constants';
import type { SaveResult } from '@/utils/tierLists/storage';
import { TierEditModal } from './TierEditModal';
import { TierListBoard } from './TierListBoard';
import { TierListExportModal } from './TierListExportModal';
import { type ImportTarget, TierListImportModal } from './TierListImportModal';
import type { TierTileShape } from './TierItemTile';
import { TOUCH_BTN } from './styles';
import { Button, BUTTON_BASE, BUTTON_SIZES, BUTTON_VARIANTS } from '@/components/common/Button';
import { cn } from '@/utils/cn';
import { Popover, popoverTriggerProps } from '@/components/common/Popover';

export interface TierListEditorProps {
  mode: 'official' | 'custom';
  /** Namespaces the "show names" preference, e.g. the list kind. */
  preferenceKey: string;
  title: string;
  description?: string;
  kindLabel: string;
  badges?: React.ReactNode;
  items: TierItem[];
  tiers: TierDefinition[];
  /** As stored -- may include keys of items not currently shown; they are preserved on save. */
  placements: TierPlacements;
  shape: TierTileShape;
  defaultShowNames: boolean;
  resetMessage: string;
  poolEmptyLabel: string;
  onSave: (tiers: TierDefinition[], placements: TierPlacements) => SaveResult;
  onReset: () => SaveResult;
  buildExportDoc: (tiers: TierDefinition[], placements: TierPlacements) => TierListDocument;
  importTarget: ImportTarget;
  onImport: (doc: TierListDocument) => SaveResult;
  onRemoveItem?: (key: string) => SaveResult;
  /** Custom lists only: where "Edit details" sends them -- the creator, prefilled. */
  editHref?: string;
  onDelete?: () => void;
  locale: string;
  dict: Dictionary;
}

const MENU_ITEM =
  'flex w-full min-h-[44px] items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-text-primary hover:bg-bg-elevated cursor-pointer transition-colors';

type Dialog = 'reset' | 'export' | 'import' | 'delete' | null;

const isOnOff = (v: string): v is 'on' | 'off' => v === 'on' || v === 'off';

/**
 * Everything around the board that official and custom lists share: header,
 * toolbar, tier editing, reset / import / export, and the "not saved"
 * notice. The page supplies the data and how to persist it.
 */
export function TierListEditor(props: TierListEditorProps) {
  const {
    mode,
    preferenceKey,
    title,
    description,
    kindLabel,
    badges,
    items,
    tiers,
    placements,
    shape,
    defaultShowNames,
    resetMessage,
    poolEmptyLabel,
    onSave,
    onReset,
    buildExportDoc,
    importTarget,
    onImport,
    onRemoveItem,
    editHref,
    onDelete,
    locale,
    dict,
  } = props;
  const t = dict.tierLists;

  const [dialog, setDialog] = useState<Dialog>(null);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = React.useRef<HTMLButtonElement>(null);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<'quota' | 'unavailable' | null>(null);
  const [showNamesPref, setShowNamesPref] = usePersistentString<'on' | 'off'>(
    `lemondbd_tier_lists_names_${preferenceKey}`,
    defaultShowNames ? 'on' : 'off',
    isOnOff
  );
  const showNames = showNamesPref === 'on';

  const board = useMemo(() => buildBoard(items, tiers, placements), [items, tiers, placements]);
  const visibleKeys = useMemo(() => new Set(items.map((i) => i.key)), [items]);
  const catalogOrder = useMemo(() => items.map((i) => i.key), [items]);
  const itemsByKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);

  // A selection whose item vanished (removed, re-imported) is dropped.
  useEffect(() => {
    if (selectedKey && !visibleKeys.has(selectedKey)) setSelectedKey(null);
  }, [selectedKey, visibleKeys]);

  useEffect(() => {
    if (!selectedKey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedKey(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedKey]);

  const report = useCallback((result: SaveResult) => {
    setSaveError(result.ok ? null : result.reason);
  }, []);

  const commit = useCallback(
    (nextTiers: TierDefinition[], nextBoard: BoardContainers) => {
      report(onSave(nextTiers, placementsFromBoard(nextBoard, nextTiers, placements, visibleKeys)));
    },
    [onSave, placements, visibleKeys, report]
  );

  const handleBoardChange = useCallback((next: BoardContainers) => commit(tiers, next), [commit, tiers]);

  const applyLadder = useCallback(
    (fn: (state: LadderState) => LadderState) => {
      const next = fn({ tiers, board });
      commit(next.tiers, next.board);
    },
    [tiers, board, commit]
  );

  const nextColor = TIER_COLOR_TOKENS[Math.min(tiers.length, TIER_COLOR_TOKENS.length - 1)];
  const editingIndex = tiers.findIndex((tier) => tier.id === editingTierId);
  const selectedItem = selectedKey ? itemsByKey.get(selectedKey) : undefined;

  const exportDoc = useMemo(
    () => (dialog === 'export' ? buildExportDoc(tiers, placementsFromBoard(board, tiers, placements, visibleKeys)) : null),
    [dialog, buildExportDoc, tiers, board, placements, visibleKeys]
  );

  const pageTitle = title || t.untitled;
  const isDuplicateKind = Boolean(
    kindLabel && pageTitle && kindLabel.trim().toLowerCase() === pageTitle.trim().toLowerCase()
  );
  const showKindBadge = Boolean(kindLabel && !isDuplicateKind);

  return (
    <div className="relative z-10 flex flex-col gap-3 sm:gap-4 h-full min-h-0">
      {/* Phones: one compact row (back, title, actions menu). Wider screens use the full header below. */}
      <div className="flex shrink-0 items-center gap-2 sm:hidden">
        <Link
          href={`/${locale}/tier-lists`}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-0.5 rounded-xl pr-1 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-accent-red transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {t.backShort}
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-sm font-black uppercase tracking-wider text-text-primary">
          {pageTitle}
        </h1>
        <button
          ref={menuRef}
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={t.toolbarAria}
          {...popoverTriggerProps(menuOpen, 'menu')}
          className={cn(BUTTON_BASE, BUTTON_VARIANTS.secondary, BUTTON_SIZES.md, TOUCH_BTN, 'shrink-0')}
        >
          <Ellipsis className="h-4 w-4" aria-hidden="true" />
        </button>
        <Popover
          open={menuOpen}
          anchorRef={menuRef}
          onClose={() => setMenuOpen(false)}
          align="end"
          role="menu"
          ariaLabel={t.toolbarAria}
          className="min-w-[13rem] rounded-2xl border border-border-color bg-bg-surface p-1.5 shadow-xl"
        >
          <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => { setMenuOpen(false); setShowNamesPref(showNames ? 'off' : 'on'); }}>
            {showNames ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            {showNames ? t.hideNames : t.showNames}
          </button>
          <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => { setMenuOpen(false); setDialog('import'); }}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            {t.import}
          </button>
          <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => { setMenuOpen(false); setDialog('export'); }}>
            <Share2 className="h-4 w-4" aria-hidden="true" />
            {t.export}
          </button>
          <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => { setMenuOpen(false); setDialog('reset'); }}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t.reset}
          </button>
          {mode === 'custom' && editHref && (
            <Link href={editHref} role="menuitem" className={MENU_ITEM} onClick={() => setMenuOpen(false)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {t.editDetails}
            </Link>
          )}
          {mode === 'custom' && onDelete && (
            <button type="button" role="menuitem" className={cn(MENU_ITEM, 'text-accent-red')} onClick={() => { setMenuOpen(false); setDialog('delete'); }}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t.deleteList}
            </button>
          )}
        </Popover>
      </div>

      <header className="hidden sm:flex flex-col gap-3 shrink-0">
        <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] xl:items-center">
          <div className="flex items-center justify-center xl:justify-start gap-3 shrink-0 xl:justify-self-start">
            <Link
              href={`/${locale}/tier-lists`}
              className="inline-flex min-h-[44px] w-fit items-center gap-1 rounded-xl pr-3 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-accent-red transition-colors"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {t.backToHub}
            </Link>
            {badges}
          </div>

          <div className="min-w-0 text-center px-2">
            <div className="inline-flex flex-wrap items-center justify-center gap-2">
              {showKindBadge && (
                <span className="rounded-lg border border-accent-red/30 bg-accent-red/10 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-accent-red">
                  {kindLabel}
                </span>
              )}
              <h1 className="text-base sm:text-lg lg:text-xl font-black uppercase tracking-wider text-text-primary truncate">
                {pageTitle}
              </h1>
            </div>
            {description && (
              <p className="mt-1 hidden sm:block text-xs sm:text-sm text-text-secondary max-w-2xl mx-auto text-center line-clamp-2">
                {description}
              </p>
            )}
          </div>

          <div role="toolbar" aria-label={t.toolbarAria} className="flex flex-wrap items-center gap-2 shrink-0 justify-center xl:justify-self-end xl:justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowNamesPref(showNames ? 'off' : 'on')}
              aria-pressed={showNames}
              aria-label={showNames ? t.hideNames : t.showNames}
              className={TOUCH_BTN}
            >
              {showNames ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              <span className="hidden sm:inline">{showNames ? t.hideNames : t.showNames}</span>
            </Button>
            <Button variant="secondary" onClick={() => setDialog('import')} aria-label={t.import} className={TOUCH_BTN}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t.import}</span>
            </Button>
            <Button variant="secondary" onClick={() => setDialog('export')} aria-label={t.export} className={TOUCH_BTN}>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t.export}</span>
            </Button>
            <Button variant="secondary" onClick={() => setDialog('reset')} aria-label={t.reset} className={TOUCH_BTN}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t.reset}</span>
            </Button>
            {mode === 'custom' && editHref && (
              <Link href={editHref} aria-label={t.editDetails} className={cn(BUTTON_BASE, BUTTON_VARIANTS.secondary, BUTTON_SIZES.md, TOUCH_BTN)}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t.editDetails}</span>
              </Link>
            )}
            {mode === 'custom' && onDelete && (
              <Button variant="soft" onClick={() => setDialog('delete')} aria-label={t.deleteList} className={TOUCH_BTN}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t.deleteList}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {saveError && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-accent-red/40 bg-accent-red/10 p-3 text-sm font-semibold text-accent-red">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{saveError === 'quota' ? t.saveFailedQuota : t.saveFailedUnavailable}</span>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            aria-label={t.dismiss}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-accent-red/20 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {selectedItem && (
        // `fixed` (not part of normal flow) on purpose: this used to sit
        // inline above the board and shove every tier row down the instant
        // an item was selected -- and back up on deselect -- a layout jump
        // on every tap. Floating it over the page instead keeps the tap-to-
        // select flow (and its cancel/remove actions) working exactly as
        // before with zero effect on anything else's position.
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lemon-modal-overlay-sidebar-aware"
        >
          <div className="pointer-events-auto flex max-w-xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-accent-amber/40 bg-bg-surface shadow-lg px-3 py-1.5 text-sm font-semibold text-accent-amber text-center">
            <MousePointerClick className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0">{t.selectedHint.replace('{name}', selectedItem.name)}</span>
            {mode === 'custom' && onRemoveItem && (
              <Button
                variant="soft"
                onClick={() => {
                  report(onRemoveItem(selectedItem.key));
                  setSelectedKey(null);
                }}
                className={TOUCH_BTN}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t.removeItem}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setSelectedKey(null)} className={TOUCH_BTN}>
              {t.cancelSelection}
            </Button>
          </div>
        </div>
      )}

      <TierListBoard
        items={items}
        tiers={tiers}
        board={board}
        onBoardChange={handleBoardChange}
        onEditTier={setEditingTierId}
        selectedKey={selectedKey}
        onSelectedKeyChange={setSelectedKey}
        shape={shape}
        showNames={showNames}
        poolEmptyLabel={poolEmptyLabel}
        dict={dict}
      />

      <TierEditModal
        tier={editingIndex >= 0 ? tiers[editingIndex] : null}
        index={editingIndex}
        tierCount={tiers.length}
        onClose={() => setEditingTierId(null)}
        onSave={(id, patch) => applyLadder((s) => updateTier(s, id, patch))}
        onMove={(id, dir) => applyLadder((s) => moveTier(s, id, dir))}
        onClear={(id) => applyLadder((s) => clearTier(s, id, catalogOrder))}
        onDelete={(id) => applyLadder((s) => removeTier(s, id, catalogOrder))}
        onAddBelow={(at) => applyLadder((s) => addTier(s, t.newTierLabel, nextColor, at))}
        dict={dict}
      />

      <ConfirmModal
        open={dialog === 'reset'}
        title={t.resetTitle}
        message={resetMessage}
        confirmLabel={t.reset}
        confirmIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
        cancelLabel={t.cancel}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          report(onReset());
          setSelectedKey(null);
          setDialog(null);
        }}
      />

      {mode === 'custom' && onDelete && (
        <ConfirmModal
          open={dialog === 'delete'}
          title={t.deleteListTitle}
          message={t.deleteListMessage}
          confirmLabel={t.deleteList}
          confirmIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
          cancelLabel={t.cancel}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null);
            onDelete();
          }}
        />
      )}

      <TierListExportModal doc={exportDoc} onClose={() => setDialog(null)} locale={locale} dict={dict} />

      <TierListImportModal
        open={dialog === 'import'}
        target={importTarget}
        onClose={() => setDialog(null)}
        onImport={(doc) => {
          report(onImport(doc));
          setSelectedKey(null);
          setDialog(null);
        }}
        dict={dict}
      />

    </div>
  );
}
