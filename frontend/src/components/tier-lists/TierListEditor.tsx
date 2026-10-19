'use client';
// frontend/src/components/tier-lists/TierListEditor.tsx

import { useDictionary } from '@/context/DictionaryContext';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Ellipsis,
  Eye,
  EyeOff,
  Flag,
  MousePointerClick,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import type { TierDefinition, TierItem, TierListDocument, TierPlacements } from '@/types/tierList';
import { usePersistentString } from '@/hooks/usePersistentString';
import { useFinePointer } from '@/hooks/useFinePointer';
import {
  type BoardContainers,
  type LadderState,
  addTier,
  buildBoard,
  clearTier,
  placementsFromBoard,
  removeTier,
  reorderTiers,
  updateTier,
} from '@/utils/tierLists/board';
import { TIER_COLOR_TOKENS, TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import { isBoardScale, type BoardScale, type BoardScaleStep } from '@/utils/tierLists/fit';
import type { SaveResult } from '@/utils/tierLists/storage';
import { TierEditModal } from './TierEditModal';
import { TierListBoard } from './TierListBoard';
import { TierListExportModal } from './TierListExportModal';
import { type ImportTarget, TierListImportModal } from './TierListImportModal';
import { TierListScaleControl } from './TierListScaleControl';
import type { TierTileShape } from './TierItemTile';
import { TOUCH_BTN } from './styles';
import { Alert } from '@/components/common/Alert';
import { Button, buttonClassName } from '@/components/common/Button';
import { MenuItem, menuItemClassName } from '@/components/common/MenuItem';
import { Popover, popoverTriggerProps } from '@/components/common/Popover';
import { tip } from '@/components/common/Tooltip';
import { formatMessage } from '@/utils/i18nFormat';
import { Surface } from '@/components/common/Surface';

export interface TierListEditorProps {
  mode: 'official' | 'custom';
  /** Namespaces the "show names" preference, e.g. the list kind. */
  preferenceKey: string;
  title: string;
  description?: string;
  kindLabel?: string;
  items: TierItem[];
  tiers: TierDefinition[];
  /** As stored -- may include keys of items not currently shown; they are preserved on save. */
  placements: TierPlacements;
  shape: TierTileShape;
  defaultShowNames: boolean;
  resetMessage: string;
  poolEmptyLabel: string;
  /** Whether the user can add, edit, delete, or reorder tiers (true for custom lists and admins on official lists). */
  canEditTiers?: boolean;
  onSave: (tiers: TierDefinition[], placements: TierPlacements) => SaveResult;
  onReset: () => SaveResult;
  buildExportDoc: (tiers: TierDefinition[], placements: TierPlacements) => TierListDocument;
  importTarget: ImportTarget;
  onImport: (doc: TierListDocument) => SaveResult;
  onRemoveItem?: (key: string) => SaveResult;
  /** Where "Edit details" sends them -- the creator, prefilled. */
  editHref?: string;
  onDelete?: () => void;
  onReport?: () => void;
  locale: string;
}

const TOOLBAR_BTN = 'min-h-9 shrink-0 whitespace-nowrap px-2.5 text-xs cursor-pointer';

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
    kindLabel,
    items,
    tiers,
    placements,
    shape,
    defaultShowNames,
    resetMessage,
    poolEmptyLabel,
    canEditTiers = mode === 'custom',
    onSave,
    onReset,
    buildExportDoc,
    importTarget,
    onImport,
    onRemoveItem,
    editHref,
    onDelete,
    onReport,
    locale,
  } = props;
  const dict = useDictionary();
  const t = dict.tierLists;

  const [dialog, setDialog] = useState<Dialog>(null);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = React.useRef<HTMLButtonElement>(null);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [addingTier, setAddingTier] = useState<boolean>(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<'quota' | 'unavailable' | null>(null);
  // Device-wide, like the names preference; stored as '40'..'130' or 'fit'.
  const [scalePref, setScalePref] = usePersistentString<string>(
    'lemondbd_tier_lists_scale',
    '100',
    (v): v is string => isBoardScale(v)
  );
  const scale: BoardScale = scalePref === 'fit' ? 'fit' : (Number(scalePref) as BoardScaleStep);
  const setScale = useCallback((next: BoardScale) => setScalePref(String(next)), [setScalePref]);
  // Mouse users get the name from the tile tooltip, so the toggle only exists on touch devices.
  const finePointer = useFinePointer();
  const [showNamesPref, setShowNamesPref] = usePersistentString<'on' | 'off'>(
    `lemondbd_tier_lists_names_${preferenceKey}`,
    defaultShowNames ? 'on' : 'off',
    isOnOff
  );
  const showNames = showNamesPref === 'on' && !finePointer;

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
      if (!canEditTiers) return;
      const next = fn({ tiers, board });
      const nextPlacements = placementsFromBoard(next.board, next.tiers, placements, visibleKeys);
      report(onSave(next.tiers, nextPlacements));
    },
    [canEditTiers, tiers, board, placements, visibleKeys, report, onSave]
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
  const hasExtendedToolbar = mode === 'custom' || canEditTiers;
  const secondaryLabelClass = hasExtendedToolbar ? 'sr-only' : 'hidden xl:inline short:hidden!';

  return (
    <div className="relative z-10 flex flex-col gap-3 sm:gap-3.5 w-full">
      {/* Phones: one compact row (back, title, actions menu). Wider screens use the full header below. */}
      <div className="flex shrink-0 items-center gap-2 sm:hidden">
        <span className="w-11 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1 flex flex-col items-center justify-center text-center">
          {showKindBadge && (
            <span className="type-label-xs text-text-muted mb-0.5">
              {kindLabel}
            </span>
          )}
          <h1 className="max-w-full truncate text-center type-label text-text-primary">
            {pageTitle}
          </h1>
        </div>
        <Button
          ref={menuRef}
          variant="secondary"
          icon
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={t.toolbarAria}
          {...popoverTriggerProps(menuOpen, 'menu')}
          className="h-11 w-11"
        >
          <Ellipsis className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Popover
          open={menuOpen}
          anchorRef={menuRef}
          onClose={() => setMenuOpen(false)}
          align="end"
          role="menu"
          ariaLabel={t.toolbarAria}
          className="min-w-56 rounded-card border border-border-color bg-bg-surface p-1.5 shadow-xl"
        >
          <TierListScaleControl scale={scale} onScaleChange={setScale} variant="menu" />
          {canEditTiers && (
            <MenuItem role="menuitem"
              disabled={tiers.length >= TIER_LIST_LIMITS.maxTiers}
              onClick={() => {
                setMenuOpen(false);
                setAddingTier(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t.addTier}
            </MenuItem>
          )}
          {!finePointer && (
            <MenuItem role="menuitem" onClick={() => { setMenuOpen(false); setShowNamesPref(showNames ? 'off' : 'on'); }}>
              {showNames ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              {showNames ? t.hideNames : t.showNames}
            </MenuItem>
          )}
          <MenuItem role="menuitem" onClick={() => { setMenuOpen(false); setDialog('import'); }}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            {t.import}
          </MenuItem>
          <MenuItem role="menuitem" onClick={() => { setMenuOpen(false); setDialog('export'); }}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {t.export}
          </MenuItem>
          <MenuItem role="menuitem" onClick={() => { setMenuOpen(false); setDialog('reset'); }}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t.reset}
          </MenuItem>
          {editHref && (
            <Link href={editHref} role="menuitem" className={menuItemClassName()} onClick={() => setMenuOpen(false)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {t.editDetails}
            </Link>
          )}
          {onDelete && (
            <MenuItem role="menuitem" className="text-accent-red" onClick={() => { setMenuOpen(false); setDialog('delete'); }}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t.deleteList}
            </MenuItem>
          )}
          {onReport && (
            <MenuItem role="menuitem" onClick={() => { setMenuOpen(false); onReport(); }}>
              <Flag className="h-4 w-4" aria-hidden="true" />
              {t.reportButton}
            </MenuItem>
          )}
        </Popover>
      </div>

      <header className="hidden sm:flex flex-col shrink-0">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <div className="flex items-center justify-start gap-2 shrink-0 justify-self-start">
            <TierListScaleControl scale={scale} onScaleChange={setScale} />
          </div>

          <div className="min-w-0 flex flex-col items-center justify-center text-center px-2">
            {showKindBadge && (
              <span className="type-label-xs text-text-muted mb-0.5 short:hidden">
                {kindLabel}
              </span>
            )}
            <h1 className="max-w-full text-base sm:text-lg lg:text-xl font-black uppercase tracking-wider text-text-primary truncate leading-tight">
              {pageTitle}
            </h1>
          </div>

          <div role="toolbar" aria-label={t.toolbarAria} className="flex flex-nowrap items-center gap-1.5 shrink-0 justify-self-end justify-end">
            {canEditTiers && (
              <Button
                variant="secondary"
                size="sm"
                disabled={tiers.length >= TIER_LIST_LIMITS.maxTiers}
                onClick={() => setAddingTier(true)}
                aria-label={t.addTier}
                {...tip(t.addTier, undefined, 'action')}
                className={TOOLBAR_BTN}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden lg:inline short:hidden!">{t.addTier}</span>
              </Button>
            )}
            {!finePointer && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowNamesPref(showNames ? 'off' : 'on')}
                aria-pressed={showNames}
                aria-label={showNames ? t.hideNames : t.showNames}
                {...tip(showNames ? t.hideNames : t.showNames, undefined, 'action')}
                className={TOOLBAR_BTN}
              >
                {showNames ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                <span className={secondaryLabelClass}>{showNames ? t.hideNames : t.showNames}</span>
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setDialog('import')} aria-label={t.import} {...tip(t.import, undefined, 'action')} className={TOOLBAR_BTN}>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              <span className={secondaryLabelClass}>{t.import}</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDialog('export')} aria-label={t.export} {...tip(t.export, undefined, 'action')} className={TOOLBAR_BTN}>
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span className={secondaryLabelClass}>{t.export}</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDialog('reset')} aria-label={t.reset} {...tip(t.reset, undefined, 'action')} className={TOOLBAR_BTN}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span className={secondaryLabelClass}>{t.reset}</span>
            </Button>
            {onReport && (
              <Button variant="secondary" size="sm" onClick={onReport} aria-label={t.reportButtonAria} {...tip(t.reportButton, undefined, 'action')} className={TOOLBAR_BTN}>
                <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                <span className={secondaryLabelClass}>{t.reportButton}</span>
              </Button>
            )}
            {editHref && (
              <Link
                href={editHref}
                aria-label={t.editDetails}
                {...tip(t.editDetails, undefined, 'action')}
                className={buttonClassName('secondary', 'sm', TOOLBAR_BTN)}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden xl:inline short:hidden!">{t.editDetails}</span>
              </Link>
            )}
            {onDelete && (
              <Button
                variant="soft"
                size="sm"
                onClick={() => setDialog('delete')}
                aria-label={t.deleteList}
                {...tip(t.deleteList, undefined, 'action')}
                className={TOOLBAR_BTN}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">{t.deleteList}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {saveError && (
        <Alert onDismiss={() => setSaveError(null)} dismissLabel={t.dismiss}>
          {saveError === 'quota' ? t.saveFailedQuota : t.saveFailedUnavailable}
        </Alert>
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
          <Surface padding="none" className="pointer-events-auto flex max-w-xl flex-wrap items-center justify-center gap-2 border-accent-amber/40 shadow-lg px-3 py-1.5 type-card-title text-accent-amber text-center">
            <MousePointerClick className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0">{formatMessage(t.selectedHint, { name: selectedItem.name })}</span>
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
          </Surface>
        </div>
      )}

      <TierListBoard
        items={items}
        tiers={tiers}
        board={board}
        onBoardChange={handleBoardChange}
        onReorderTiers={canEditTiers ? (fromId, toId) => applyLadder((s) => reorderTiers(s, fromId, toId)) : undefined}
        // Emptying a row is just moving its items back to the pool, so every ranker gets it, not only tier editors.
        onClearTier={(id) => commit(tiers, clearTier({ tiers, board }, id, catalogOrder).board)}
        onEditTier={(id) => {
          if (!canEditTiers) return;
          setAddingTier(false);
          setEditingTierId(id);
        }}
        canEditTiers={canEditTiers}
        selectedKey={selectedKey}
        onSelectedKeyChange={setSelectedKey}
        shape={shape}
        showNames={showNames}
        scale={scale}
        poolEmptyLabel={poolEmptyLabel}
      />

      {canEditTiers && (
        <TierEditModal
          mode={addingTier ? 'add' : 'edit'}
          tier={!addingTier && editingIndex >= 0 ? tiers[editingIndex] : null}
          defaultColor={nextColor}
          tierCount={tiers.length}
          onClose={() => {
            setEditingTierId(null);
            setAddingTier(false);
          }}
          onSave={(id, patch) => applyLadder((s) => updateTier(s, id, patch))}
          onCreate={(patch) => applyLadder((s) => addTier(s, patch.label, patch.color, undefined, patch.backgroundImage))}
          onDelete={(id) => applyLadder((s) => removeTier(s, id, catalogOrder))}
        />
      )}

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

      {onDelete && (
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

      <TierListExportModal doc={exportDoc} onClose={() => setDialog(null)} locale={locale} />

      <TierListImportModal
        open={dialog === 'import'}
        target={importTarget}
        onClose={() => setDialog(null)}
        onImport={(doc) => {
          report(onImport(doc));
          setSelectedKey(null);
          setDialog(null);
        }}
      />

    </div>
  );
}
