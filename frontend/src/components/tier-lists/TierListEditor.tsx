'use client';
// frontend/src/components/tier-lists/TierListEditor.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Eye,
  EyeOff,
  ImagePlus,
  MousePointerClick,
  Pencil,
  Plus,
  RotateCcw,
  Share2,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
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
import { TIER_COLOR_TOKENS, TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import type { SaveResult } from '@/utils/tierLists/storage';
import { AddItemModal, ListDetailsModal } from './CustomListModals';
import { TierEditModal } from './TierEditModal';
import { TierListBoard } from './TierListBoard';
import { TierListExportModal } from './TierListExportModal';
import { type ImportTarget, TierListImportModal } from './TierListImportModal';
import type { TierTileShape } from './TierItemTile';
import { BTN_DANGER_GHOST, BTN_SECONDARY } from './styles';

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
  onAddItem?: (item: { name: string; image?: string }) => SaveResult;
  onRemoveItem?: (key: string) => SaveResult;
  onEditDetails?: (details: { title: string; description: string }) => SaveResult;
  onDelete?: () => void;
  locale: string;
  dict: Dictionary;
}

type Dialog = 'reset' | 'export' | 'import' | 'addItem' | 'details' | 'delete' | null;

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
    onAddItem,
    onRemoveItem,
    onEditDetails,
    onDelete,
    locale,
    dict,
  } = props;
  const t = dict.tierLists;

  const [dialog, setDialog] = useState<Dialog>(null);
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
    <div className="relative z-10 flex flex-col gap-4">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0 md:min-w-[160px]">
            <Link
              href={`/${locale}/tier-lists`}
              className="inline-flex min-h-[44px] w-fit items-center gap-1 rounded-xl pr-3 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-accent-red transition-colors"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {t.backToHub}
            </Link>
            {badges}
          </div>

          <div className="flex-1 min-w-0 text-center px-2">
            <div className="inline-flex flex-wrap items-center justify-center gap-2">
              {showKindBadge && (
                <span className="rounded-lg border border-accent-red/30 bg-accent-red/10 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-accent-red">
                  {kindLabel}
                </span>
              )}
              <h1 className="text-base sm:text-lg lg:text-xl font-black uppercase tracking-wider font-mono text-text-primary truncate">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div role="toolbar" aria-label={t.toolbarAria} className="flex flex-wrap items-center gap-2 shrink-0 md:min-w-[160px] justify-start md:justify-end">
            <button
              type="button"
              onClick={() => setShowNamesPref(showNames ? 'off' : 'on')}
              aria-pressed={showNames}
              aria-label={showNames ? t.hideNames : t.showNames}
              className={BTN_SECONDARY}
            >
              {showNames ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              <span className="hidden sm:inline">{showNames ? t.hideNames : t.showNames}</span>
            </button>
            <button
              type="button"
              disabled={tiers.length >= TIER_LIST_LIMITS.maxTiers}
              onClick={() => applyLadder((s) => addTier(s, t.newTierLabel, nextColor))}
              aria-label={t.addTier}
              className={BTN_SECONDARY}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t.addTier}</span>
            </button>
            {mode === 'custom' && onAddItem && (
              <button type="button" onClick={() => setDialog('addItem')} aria-label={t.addItem} className={BTN_SECONDARY}>
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t.addItem}</span>
              </button>
            )}
            <button type="button" onClick={() => setDialog('import')} aria-label={t.import} className={BTN_SECONDARY}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t.import}</span>
            </button>
            <button type="button" onClick={() => setDialog('export')} aria-label={t.export} className={BTN_SECONDARY}>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t.export}</span>
            </button>
            <button type="button" onClick={() => setDialog('reset')} aria-label={t.reset} className={BTN_SECONDARY}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t.reset}</span>
            </button>
            {mode === 'custom' && onEditDetails && (
              <button type="button" onClick={() => setDialog('details')} aria-label={t.editDetails} className={BTN_SECONDARY}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t.editDetails}</span>
              </button>
            )}
            {mode === 'custom' && onDelete && (
              <button type="button" onClick={() => setDialog('delete')} aria-label={t.deleteList} className={BTN_DANGER_GHOST}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t.deleteList}</span>
              </button>
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
        <div aria-live="polite">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-accent-amber/40 bg-accent-amber/10 px-3 py-1.5 text-sm font-semibold text-accent-amber">
            <MousePointerClick className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{t.selectedHint.replace('{name}', selectedItem.name)}</span>
            {mode === 'custom' && onRemoveItem && (
              <button
                type="button"
                onClick={() => {
                  report(onRemoveItem(selectedItem.key));
                  setSelectedKey(null);
                }}
                className={BTN_DANGER_GHOST}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t.removeItem}
              </button>
            )}
            <button type="button" onClick={() => setSelectedKey(null)} className={BTN_SECONDARY}>
              {t.cancelSelection}
            </button>
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

      {onAddItem && (
        <AddItemModal
          open={dialog === 'addItem'}
          onClose={() => setDialog(null)}
          onAdd={(item) => report(onAddItem(item))}
          dict={dict}
        />
      )}

      {onEditDetails && (
        <ListDetailsModal
          open={dialog === 'details'}
          title={title}
          description={description ?? ''}
          onClose={() => setDialog(null)}
          onSave={(details) => report(onEditDetails(details))}
          dict={dict}
        />
      )}
    </div>
  );
}
