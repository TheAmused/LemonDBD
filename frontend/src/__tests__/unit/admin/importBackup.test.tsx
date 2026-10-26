// frontend/src/__tests__/unit/admin/importBackup.test.tsx
//
// The database-backup import tab: a backup is staged by dropping it on the zone or picking it, only a
// JSON object is accepted, and a staged file can be removed again. Rendered in a DOM with the real
// hook and tab, so these are the user's interactions, not the source text.
import { act, createEvent, fireEvent, render, screen, waitFor, withDictionary } from '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import en from '@/locales/en';
import { ImportTab } from '@/components/scraper-config/ImportTab';
import { useImportTab } from '@/components/scraper-config/useImportTab';

function Harness() {
  const tab = useImportTab();
  return <ImportTab tab={tab} />;
}

const renderTab = () => render(<Harness />, { wrapper: withDictionary() });
const dropZone = () => screen.getByRole('button', { name: en.admin.clickOrDragBackup }).parentElement as HTMLElement;
const file = (name: string, body: string, type = 'application/json') => new File([body], name, { type });
const drop = (f: File) => act(() => void fireEvent.drop(dropZone(), { dataTransfer: { files: [f], items: [f] } }));

describe('backup import: staging a file', () => {
  it('a dropped JSON backup is staged and shown with its name', async () => {
    renderTab();
    await drop(file('backup-2026.json', '{"perks": []}'));
    assert.ok(screen.getByText('backup-2026.json'));
    assert.ok(!screen.queryByText(en.admin.invalidJsonFile));
  });

  it('a file that is not JSON is refused with the translated message', async () => {
    renderTab();
    await drop(file('notes.txt', 'hello', 'text/plain'));
    assert.ok(screen.getByText(en.admin.invalidJsonFile));
    assert.ok(!screen.queryByText('notes.txt'));
  });

  it('a .json file whose content is not a JSON object is refused once it has been read', async () => {
    renderTab();
    await drop(file('broken.json', '[1, 2, 3]'));
    await waitFor(() => assert.ok(!screen.queryByText('broken.json')));
    assert.ok(screen.getByText(en.admin.invalidJsonFile));
  });

  it('the remove button un-stages the file', async () => {
    renderTab();
    await drop(file('backup.json', '{}'));
    fireEvent.click(screen.getByRole('button', { name: en.admin.removeFile }));
    assert.ok(!screen.queryByText('backup.json'));
  });

  it('clicking the zone opens the file picker (a native button, keyboard-operable)', () => {
    const { container } = renderTab();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    let opened = 0;
    input.click = () => void (opened += 1);
    fireEvent.click(screen.getByRole('button', { name: en.admin.clickOrDragBackup }));
    assert.equal(opened, 1);
    assert.equal(input.accept, '.json,application/json');
  });

  it('dragging over the zone asks for a copy and shows the drop prompt', () => {
    renderTab();
    const dataTransfer = { dropEffect: 'none', items: [{}], files: [] };
    fireEvent.dragEnter(dropZone(), { dataTransfer });
    const over = createEvent.dragOver(dropZone(), { dataTransfer });
    fireEvent(dropZone(), over);
    assert.equal((over as DragEvent).dataTransfer?.dropEffect, 'copy');
    assert.equal(over.defaultPrevented, true, 'the browser must not open the file itself');
    assert.ok(screen.getByText(en.admin.dropFilePrompt));
  });

  it('the import button stays disabled until a file is staged', async () => {
    renderTab();
    const importButton = () => screen.getByRole('button', { name: new RegExp(en.admin.executeImport) }) as HTMLButtonElement;
    assert.equal(importButton().disabled, true);
    await drop(file('backup.json', '{}'));
    assert.equal(importButton().disabled, false);
  });
});
