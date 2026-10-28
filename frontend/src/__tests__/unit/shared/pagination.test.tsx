// frontend/src/__tests__/unit/shared/pagination.test.tsx
//
// The pager: arrows move one page and stop at the ends; the page number between them is an editable
// "go to page" field that commits on Enter or blur and ignores a page outside the range.
import { fireEvent, render, screen, withDictionary } from '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import en from '@/locales/en';
import { Pagination } from '@/components/common/Pagination';

function pager(page: number, totalPages = 10) {
  const pages: number[] = [];
  render(
    <Pagination page={page} totalPages={totalPages} totalResults={totalPages * 15} limit={15} onPageChange={(p) => void pages.push(p)} onLimitChange={() => {}} />,
    { wrapper: withDictionary() }
  );
  return pages;
}
const t = en.pagination;
const pageField = () => screen.getByLabelText(t.goTo) as HTMLInputElement;

describe('Pagination', () => {
  it('the arrows move one page, and are disabled at the ends', () => {
    const pages = pager(1);
    assert.equal((screen.getByRole('button', { name: t.previous }) as HTMLButtonElement).disabled, true);
    fireEvent.click(screen.getByRole('button', { name: t.next }));
    assert.deepEqual(pages, [2]);
  });

  it('the last page cannot go further', () => {
    pager(10);
    assert.equal((screen.getByRole('button', { name: t.next }) as HTMLButtonElement).disabled, true);
  });

  it('typing a page and pressing Enter goes there', () => {
    const pages = pager(1);
    pageField().focus();
    fireEvent.change(pageField(), { target: { value: '7' } });
    fireEvent.keyDown(pageField(), { key: 'Enter' });
    assert.deepEqual(pages, [7]);
  });

  it('a page outside the range is not followed: the field goes back to the current page', () => {
    const pages = pager(3);
    for (const value of ['99', '0', '2.5']) {
      fireEvent.change(pageField(), { target: { value } });
      fireEvent.blur(pageField());
      assert.equal(pageField().value, '3', value);
    }
    assert.deepEqual(pages, []);
  });
});
