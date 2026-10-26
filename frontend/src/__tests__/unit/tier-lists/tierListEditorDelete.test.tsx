// frontend/src/__tests__/unit/tier-lists/tierListEditorDelete.test.tsx
//
// The list editor offers "Delete list" only when the page gives it a delete action (a custom list,
// or an official one for an admin), and deletes only after the confirmation.
import { fireEvent, render, routeFetch, screen, withAppProviders } from '../../helpers/dom';
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import en from '@/locales/en';
import { TierListEditor } from '@/components/tier-lists/TierListEditor';
import { DEFAULT_TIERS } from '@/utils/tierLists/constants';

const t = en.tierLists;
let api: ReturnType<typeof routeFetch>;
beforeEach(() => {
  api = routeFetch({ '/auth/me': { body: { authenticated: false } }, '/site-config': { body: {} } });
});
afterEach(() => api.restore());

function editor(onDelete?: () => void) {
  render(
    <TierListEditor
      mode="custom"
      preferenceKey="custom"
      title="Mine"
      items={[{ key: 'a', name: 'Alpha', image: null }]}
      tiers={[...DEFAULT_TIERS]}
      placements={{}}
      shape="square"
      defaultShowNames
      resetMessage="reset"
      poolEmptyLabel="empty"
      onSave={() => ({ ok: true }) as never}
      onReset={() => ({ ok: true }) as never}
      buildExportDoc={() => ({}) as never}
      importTarget={{ kind: 'custom' }}
      onImport={() => ({ ok: true }) as never}
      onDelete={onDelete}
      locale="en"
    />,
    { wrapper: withAppProviders().wrapper }
  );
  fireEvent.click(screen.getByRole('button', { name: t.toolbarAria }));
}

describe('TierListEditor: delete', () => {
  it('is not offered without a delete action', () => {
    editor();
    assert.ok(!screen.queryByRole('menuitem', { name: new RegExp(t.deleteList) }));
  });

  it('asks first, and deletes only once confirmed', () => {
    let deleted = 0;
    editor(() => void (deleted += 1));
    fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(t.deleteList) }));
    assert.ok(screen.getByText(t.deleteListTitle));
    assert.equal(deleted, 0);
    const confirm = screen.getAllByRole('button', { name: new RegExp(t.deleteList) }).at(-1) as HTMLElement;
    fireEvent.click(confirm);
    assert.equal(deleted, 1);
  });

  it('cancelling the confirmation deletes nothing', () => {
    let deleted = 0;
    editor(() => void (deleted += 1));
    fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(t.deleteList) }));
    fireEvent.click(screen.getByRole('button', { name: t.cancel }));
    assert.equal(deleted, 0);
  });
});
