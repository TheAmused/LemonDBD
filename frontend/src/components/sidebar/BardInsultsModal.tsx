'use client';
// frontend/src/components/sidebar/BardInsultsModal.tsx
//
// "Be Shakespeare in the Fog": a cheat sheet that turns the usual match-chat insults into
// something Shakespearean, one list for each side. Opened from the sidebar, so it is reachable
// from every page.

import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { Table, TableHead, TableBody, TableRow, Th, Td } from '@/components/common/Table';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import { copyTextWithFallback } from '@/utils/clipboard';

type Side = 'survivor' | 'killer';

export interface BardInsultsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BardInsultsModal: React.FC<BardInsultsModalProps> = ({ isOpen, onClose }) => {
  const t = useDictionary().sidebar;
  const [side, setSide] = useState<Side>('survivor');
  // The insult that was just copied, so its row can confirm for a moment.
  const [copiedBard, setCopiedBard] = useState<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (resetTimerRef.current) clearTimeout(resetTimerRef.current); }, []);

  const copyInsult = async (text: string) => {
    try {
      if (!(await copyTextWithFallback(text))) return;
      setCopiedBard(text);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setCopiedBard(null), 1500);
    } catch {
      // Clipboard blocked: the insult is still on screen to select by hand.
    }
  };
  // The classic gaming phrases suit both sides; the Dead by Daylight ones are per side.
  const rows = [...t.insultsRowsShared, ...(side === 'survivor' ? t.insultsRowsSurvivor : t.insultsRowsKiller)];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="lg"
      title={t.insultsTitle}
      closeButtonAriaLabel={t.insultsClose}
      padded
      bodyClassName="space-y-4"
    >
      <p className="text-center type-body text-text-secondary">{t.insultsIntro}</p>
      <p className="text-center type-label-2xs text-text-muted">{t.insultsCopyHint}</p>

      <div className="flex justify-center">
        <SegmentedControl<Side>
          ariaLabel={t.insultsSideAria}
          size="sm"
          value={side}
          onChange={setSide}
          options={[
            { value: 'survivor', label: t.insultsSideSurvivor, icon: <SurvivorIcon className="icon-sm" />, activeClassName: 'bg-accent-green text-text-inverted' },
            { value: 'killer', label: t.insultsSideKiller, icon: <KillerIcon className="icon-sm" /> },
          ]}
        />
      </div>

      <Table density="sm">
        <TableHead>
          <tr>
            <Th className="text-center">{t.insultsColumnPlain}</Th>
            <Th className="text-center">{t.insultsColumnBard}</Th>
          </tr>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.plain}>
              <Td className="text-center font-bold text-text-primary">{row.plain}</Td>
              <Td className="p-0 text-center italic text-text-secondary">
                <button
                  type="button"
                  onClick={() => { void copyInsult(row.bard); }}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 px-3 py-2 italic transition-colors hover:text-accent-red focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
                >
                  <span>{row.bard}</span>
                  {copiedBard === row.bard && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-accent-green" />}
                </button>
              </Td>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <output className="sr-only">{copiedBard ? t.insultsCopied : ''}</output>
    </Modal>
  );
};
