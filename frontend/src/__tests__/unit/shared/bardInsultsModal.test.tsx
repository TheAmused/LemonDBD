// frontend/src/__tests__/unit/shared/bardInsultsModal.test.tsx
//
// The sidebar's Shakespearean-insults dialog: what a player sees and how it closes.
import { render, screen, within, fireEvent, waitFor, withNextApp } from '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import en from '@/locales/en';
import { BardInsultsModal } from '@/components/sidebar/BardInsultsModal';

describe('BardInsultsModal', () => {
  it('lists every plain phrase next to its Shakespearean version, under the two column headings', () => {
    render(<BardInsultsModal isOpen onClose={() => {}} />, { wrapper: withNextApp().wrapper });
    const dialog = screen.getByRole('dialog');
    assert.ok(within(dialog).getByText(en.sidebar.insultsTitle));
    assert.ok(within(dialog).getByRole('columnheader', { name: en.sidebar.insultsColumnPlain }));
    assert.ok(within(dialog).getByRole('columnheader', { name: en.sidebar.insultsColumnBard }));

    const bodyRows = within(dialog).getAllByRole('row').slice(1);
    assert.deepEqual(
      bodyRows.map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent)),
      [...en.sidebar.insultsRowsShared, ...en.sidebar.insultsRowsSurvivor].map((r) => [r.plain, r.bard]),
    );
  });

  it('switching to the killer side swaps the whole table', () => {
    render(<BardInsultsModal isOpen onClose={() => {}} />, { wrapper: withNextApp().wrapper });
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('radio', { name: en.sidebar.insultsSideKiller }));
    const bodyRows = within(dialog).getAllByRole('row').slice(1);
    assert.deepEqual(
      bodyRows.map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent)),
      [...en.sidebar.insultsRowsShared, ...en.sidebar.insultsRowsKiller].map((r) => [r.plain, r.bard]),
    );
  });

  it('keeps the original chart on both sides, starting with GG', () => {
    render(<BardInsultsModal isOpen onClose={() => {}} />, { wrapper: withNextApp().wrapper });
    const dialog = screen.getByRole('dialog');
    const firstRow = () => within(within(dialog).getAllByRole('row')[1]).getAllByRole('cell').map((c) => c.textContent);
    assert.deepEqual(firstRow(), ['GG', 'A fine battle, indeed']);
    fireEvent.click(within(dialog).getByRole('radio', { name: en.sidebar.insultsSideKiller }));
    assert.deepEqual(firstRow(), ['GG', 'A fine battle, indeed']);
  });

  it('clicking an insult copies the Shakespearean text and confirms it', async () => {
    const copied: string[] = [];
    const original = Object.getOwnPropertyDescriptor(globalThis.navigator, 'clipboard');
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => { copied.push(text); } },
    });
    try {
      render(<BardInsultsModal isOpen onClose={() => {}} />, { wrapper: withNextApp().wrapper });
      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'A fine battle, indeed' }));
      await waitFor(() => assert.equal(within(dialog).getByRole('status').textContent, en.sidebar.insultsCopied));
      assert.deepEqual(copied, ['A fine battle, indeed']);
    } finally {
      if (original) Object.defineProperty(globalThis.navigator, 'clipboard', original);
      else delete (globalThis.navigator as unknown as Record<string, unknown>).clipboard;
    }
  });

  it('the header X calls onClose', () => {
    let closed = 0;
    render(<BardInsultsModal isOpen onClose={() => { closed += 1; }} />, { wrapper: withNextApp().wrapper });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: en.sidebar.insultsClose }));
    assert.equal(closed, 1);
  });

  it('renders nothing while closed', () => {
    render(<BardInsultsModal isOpen={false} onClose={() => {}} />, { wrapper: withNextApp().wrapper });
    assert.equal(screen.queryByRole('dialog'), null);
  });
});
