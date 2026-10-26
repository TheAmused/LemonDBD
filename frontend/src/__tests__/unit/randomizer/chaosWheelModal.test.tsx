// frontend/src/__tests__/unit/randomizer/chaosWheelModal.test.tsx
//
// The chaos wheel dialog closes one way (X, backdrop and Escape all call onClose) and has exactly
// one spin action: no in-card "Close" and no separate "Spin again" that spins another way.
import { fireEvent, render, screen, withDictionary } from '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import en from '@/locales/en';
import { ChaosWheelModal } from '@/components/ChaosWheelModal';

function open() {
  let closed = 0;
  const utils = render(
    <ChaosWheelModal isOpen role="Survivor" onClose={() => void (closed += 1)} onSelectMutator={() => {}} activeMutator={null} />,
    { wrapper: withDictionary() }
  );
  return { ...utils, closed: () => closed };
}

describe('ChaosWheelModal', () => {
  it('the X closes it', () => {
    const modal = open();
    fireEvent.click(screen.getByRole('button', { name: en.modal.close }));
    assert.equal(modal.closed(), 1);
  });

  it('a click on the backdrop closes it the same way', () => {
    const modal = open();
    const backdrop = document.querySelector('dialog [aria-hidden="true"].fixed.inset-0') as HTMLElement;
    fireEvent.click(backdrop);
    assert.equal(modal.closed(), 1);
  });

  it('Escape closes it the same way', () => {
    const modal = open();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    assert.equal(modal.closed(), 1);
  });

  it('offers exactly one spin action and no in-card close or spin-again button', () => {
    open();
    assert.equal(screen.getAllByRole('button', { name: en.generator.spinChaosWheel }).length, 1);
    const labels = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    const gen = en.generator as unknown as Record<string, string>;
    for (const removed of ['chaosApplyAndClose', 'chaosSpinAgain']) {
      if (gen[removed]) assert.ok(!labels.some((l) => l.includes(gen[removed])), `${removed} is back`);
    }
  });
});
