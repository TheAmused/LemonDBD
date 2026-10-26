// frontend/src/__tests__/unit/tier-lists/tierItemEditModal.test.tsx
//
// Editing an item in the creator: its name and its picture can both change; an empty name or a
// picture link the app will not load is refused.
import { fireEvent, render, screen, withDictionary } from '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import en from '@/locales/en';
import { TierItemEditModal } from '@/components/tier-lists/creator/TierItemEditModal';

const t = en.tierLists;

function open(item = { id: 'i1', name: 'Meg', image: 'https://example.com/meg.webp' }) {
  const saves: Array<[string, { name: string; image?: string }]> = [];
  let closed = 0;
  render(<TierItemEditModal item={item} isOpen onClose={() => void (closed += 1)} onSave={(id, patch) => void saves.push([id, patch])} />, {
    wrapper: withDictionary(),
  });
  return { saves, closed: () => closed };
}
const field = (label: string) => screen.getByText(label).closest('label')?.querySelector('input') as HTMLInputElement;
const save = () => screen.getByRole('button', { name: new RegExp(t.save) }) as HTMLButtonElement;

describe('TierItemEditModal', () => {
  it('saves a new name and picture, then closes', () => {
    const modal = open();
    fireEvent.change(field(t.itemName), { target: { value: '  Meg Thomas  ' } });
    fireEvent.change(field(t.itemImage), { target: { value: 'https://example.com/meg-2.webp' } });
    fireEvent.click(save());
    assert.deepEqual(modal.saves, [['i1', { name: 'Meg Thomas', image: 'https://example.com/meg-2.webp' }]]);
    assert.equal(modal.closed(), 1);
  });

  it('an empty name cannot be saved', () => {
    const modal = open();
    fireEvent.change(field(t.itemName), { target: { value: '   ' } });
    assert.equal(save().disabled, true);
    assert.deepEqual(modal.saves, []);
  });

  it('a picture link the app will not load cannot be saved', () => {
    const modal = open();
    fireEvent.change(field(t.itemImage), { target: { value: 'javascript:alert(1)' } });
    assert.equal(save().disabled, true);
    assert.deepEqual(modal.saves, []);
  });

  it('the picture can be removed, keeping the name', () => {
    const modal = open();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.creator.removeImage) }));
    fireEvent.click(save());
    assert.deepEqual(modal.saves, [['i1', { name: 'Meg', image: undefined }]]);
  });
});
