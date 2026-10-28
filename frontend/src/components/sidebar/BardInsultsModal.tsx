'use client';
// frontend/src/components/sidebar/BardInsultsModal.tsx
//
// "Be Shakespeare in the Fog": a cheat sheet that turns the usual match-chat insults into
// something Shakespearean, one list for each side. Opened from the sidebar, so it is reachable
// from every page.

import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { Table, TableHead, TableBody, TableRow, Th, Td } from '@/components/common/Table';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';

type Side = 'survivor' | 'killer';

export interface BardInsultsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BardInsultsModal: React.FC<BardInsultsModalProps> = ({ isOpen, onClose }) => {
  const t = useDictionary().sidebar;
  const [side, setSide] = useState<Side>('survivor');
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
              <Td className="text-center italic text-text-secondary">{row.bard}</Td>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Modal>
  );
};
