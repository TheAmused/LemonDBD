'use client';
// frontend/src/components/smash-or-pass/roster-select/RosterPickerFooter.tsx
import { Flag, RotateCcw, Check, Pencil, Send } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useDictionary } from '@/context/DictionaryContext';
import type { RosterItem } from '@/types/smashOrPass';
import { rosterDisplayName } from './rosterDisplay';
import { LockIcon } from '@/components/icons/DbdIcons';

interface RosterPickerFooterProps {
  /** The roster in the middle of the carousel. */
  roster: RosterItem;
  onCommit: () => void;
  onEditRoster?: (id: string) => void;
  onExportRoster?: (id: string) => void;
  onDeleteRoster?: (id: string) => void;
  onReportRoster?: (id: string) => void;
}

/** Under the carousel: choose the centred roster, or (for the viewer's own) edit, share, delete it. */
export function RosterPickerFooter({
  roster: activeRosterInCenter,
  onCommit,
  onEditRoster,
  onExportRoster,
  onDeleteRoster,
  onReportRoster,
}: RosterPickerFooterProps) {
  const dict = useDictionary();

  return (
    // `relative z-50`: the carousel's centered card sits at inline
    // `zIndex: 40` (see the per-card `style` above) so it can layer
    // over its neighbors -- without an explicit stacking context here
    // that outranks it, a tall card (long roster name/description)
    // can end up painted on top of this row and swallow clicks on
    // Select/Edit/Export/Delete even though they render visually above it.
    <div className="relative z-50 flex flex-wrap items-center justify-center gap-2.5">
      {activeRosterInCenter.is_active !== false ? (
        <Button
          variant="primary" size="lg"
          onClick={onCommit}
          className="px-8 sm:px-10 uppercase tracking-widest"
        >
          <Check className="icon-lg" aria-hidden="true" />
          <span>
            {dict.smashOrPass.selectPrefix ? `${dict.smashOrPass.selectPrefix} ` : ''}
            {rosterDisplayName(activeRosterInCenter)}
          </span>
        </Button>
      ) : (
        <Button
          variant="secondary" size="lg"
          disabled
          className="px-8 sm:px-10 uppercase tracking-widest"
        >
          <LockIcon className="icon-lg text-text-muted" aria-hidden="true" />
          <span>
            {rosterDisplayName(activeRosterInCenter)} ({dict.smashOrPass.comingSoon})
          </span>
        </Button>
      )}

      {activeRosterInCenter.is_local && (onEditRoster || onExportRoster || onDeleteRoster || onReportRoster) && (
        <>
          {onEditRoster && (
            <Button
              variant="secondary" size="lg" icon
              onClick={() => onEditRoster(activeRosterInCenter.id)}
              aria-label={dict.smashOrPass.picker.editRoster}
              className="h-11 w-11 sm:h-13 sm:w-13"
            >
              <Pencil className="icon-lg" aria-hidden="true" />
            </Button>
          )}
          {onExportRoster && (
            <Button
              variant="secondary" size="lg" icon
              onClick={() => onExportRoster(activeRosterInCenter.id)}
              aria-label={dict.smashOrPass.picker.exportRoster}
              className="h-11 w-11 sm:h-13 sm:w-13"
            >
              <Send className="icon-lg" aria-hidden="true" />
            </Button>
          )}
          {onReportRoster && (
            <Button
              variant="secondary" size="lg" icon
              onClick={() => onReportRoster(activeRosterInCenter.id)}
              aria-label={dict.tierLists.reportButtonAria}
              className="h-11 w-11 sm:h-13 sm:w-13"
            >
              <Flag className="icon-lg text-accent-red" aria-hidden="true" />
            </Button>
          )}
          {onDeleteRoster && (
            <Button
              variant="secondary" size="lg" icon
              onClick={() => onDeleteRoster(activeRosterInCenter.id)}
              aria-label={dict.smashOrPass.picker.deleteRoster}
              className="h-11 w-11 sm:h-13 sm:w-13"
            >
              <RotateCcw className="icon-lg" aria-hidden="true" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
