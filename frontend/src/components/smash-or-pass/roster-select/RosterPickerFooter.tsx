'use client';
// frontend/src/components/smash-or-pass/roster-select/RosterPickerFooter.tsx
import { Check, Plus, Pencil, Download, Flag, Trash2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';
import type { RosterItem } from '@/types/smashOrPass';
import { LockIcon, UploadIcon } from '@/components/icons/DbdIcons';
import { useOptionalAuth } from '@/context/AuthContext';

export interface RosterHeaderActionsProps {
  activeRosterInCenter?: RosterItem | null;
  onCreateRoster?: () => void;
  onImportRoster?: () => void;
  onEditRoster?: (id: string) => void;
  onExportRoster?: (id: string) => void;
  onDeleteRoster?: (id: string) => void;
  onReportRoster?: (id: string) => void;
}

export function RosterHeaderActions({
  activeRosterInCenter,
  onCreateRoster,
  onImportRoster,
  onEditRoster,
  onExportRoster,
  onDeleteRoster,
  onReportRoster,
}: RosterHeaderActionsProps) {
  const dict = useDictionary();
  const auth = useOptionalAuth();
  const isAdmin = Boolean(auth?.user?.role === 'admin');

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
      {onCreateRoster && (
        <Button
          type="button"
          onClick={onCreateRoster}
          variant="soft" size="sm" icon
          {...tip(dict.smashOrPass.picker.createRoster, undefined, 'action')}
          aria-label={dict.smashOrPass.picker.createRoster}
        >
          <Plus className="icon-md" aria-hidden="true" />
        </Button>
      )}
      {onImportRoster && (
        <Button
          type="button"
          onClick={onImportRoster}
          variant="secondary" size="sm" icon
          {...tip(dict.smashOrPass.picker.importRoster, undefined, 'action')}
          aria-label={dict.smashOrPass.picker.importRoster}
        >
          <UploadIcon className="icon-md" aria-hidden="true" />
        </Button>
      )}

      {activeRosterInCenter?.is_local && (
        <>
          {onEditRoster && (
            <Button
              type="button"
              variant="secondary" size="sm" icon
              onClick={() => onEditRoster(activeRosterInCenter.id)}
              {...tip(dict.smashOrPass.picker.editRoster, undefined, 'action')}
              aria-label={dict.smashOrPass.picker.editRoster}
            >
              <Pencil className="icon-md" aria-hidden="true" />
            </Button>
          )}
          {onExportRoster && (
            <Button
              type="button"
              variant="secondary" size="sm" icon
              onClick={() => onExportRoster(activeRosterInCenter.id)}
              {...tip(dict.smashOrPass.picker.exportRoster, undefined, 'action')}
              aria-label={dict.smashOrPass.picker.exportRoster}
            >
              <Download className="icon-md" aria-hidden="true" />
            </Button>
          )}
          {onReportRoster && (
            <Button
              type="button"
              variant="secondary" size="sm" icon
              onClick={() => onReportRoster(activeRosterInCenter.id)}
              {...tip(dict.tierLists.reportButtonAria, undefined, 'action')}
              aria-label={dict.tierLists.reportButtonAria}
            >
              <Flag className="icon-md text-accent-red" aria-hidden="true" />
            </Button>
          )}
          {onDeleteRoster && (
            <Button
              type="button"
              variant="danger" size="sm" icon
              onClick={() => onDeleteRoster(activeRosterInCenter.id)}
              {...tip(dict.smashOrPass.picker.deleteRoster, undefined, 'action')}
              aria-label={dict.smashOrPass.picker.deleteRoster}
            >
              <Trash2 className="icon-md" aria-hidden="true" />
            </Button>
          )}
        </>
      )}

      {!activeRosterInCenter?.is_local && isAdmin && activeRosterInCenter && (
        <>
          {onEditRoster && (
            <Button
              type="button"
              variant="secondary" size="sm" icon
              onClick={() => onEditRoster(activeRosterInCenter.slug)}
              {...tip(dict.smashOrPass.picker.editRoster, undefined, 'action')}
              aria-label={dict.smashOrPass.picker.editRoster}
            >
              <Pencil className="icon-md" aria-hidden="true" />
            </Button>
          )}
          {onDeleteRoster && (
            <Button
              type="button"
              variant="danger" size="sm" icon
              onClick={() => onDeleteRoster(activeRosterInCenter.slug)}
              {...tip(dict.smashOrPass.picker.deleteRoster, undefined, 'action')}
              aria-label={dict.smashOrPass.picker.deleteRoster}
            >
              <Trash2 className="icon-md" aria-hidden="true" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}

interface RosterPickerFooterProps {
  /** The roster in the middle of the carousel. */
  roster: RosterItem;
  onCommit: () => void;
  onEditRoster?: (id: string) => void;
  onExportRoster?: (id: string) => void;
  onDeleteRoster?: (id: string) => void;
  onReportRoster?: (id: string) => void;
}

/** Under the carousel: choose the centred roster. */
export function RosterPickerFooter({
  roster: activeRosterInCenter,
  onCommit,
}: RosterPickerFooterProps) {
  const dict = useDictionary();

  return (
    <div className="relative z-50 flex items-center justify-center">
      {activeRosterInCenter.is_active !== false ? (
        <Button
          variant="primary" size="lg"
          onClick={onCommit}
          className="px-8 sm:px-10 uppercase tracking-widest"
        >
          <Check className="icon-lg" aria-hidden="true" />
          <span>{dict.smashOrPass.picker.confirm}</span>
        </Button>
      ) : (
        <Button
          variant="secondary" size="lg"
          disabled
          className="px-8 sm:px-10 uppercase tracking-widest"
        >
          <LockIcon className="icon-lg text-text-muted" aria-hidden="true" />
          <span>{dict.smashOrPass.comingSoon}</span>
        </Button>
      )}
    </div>
  );
}
