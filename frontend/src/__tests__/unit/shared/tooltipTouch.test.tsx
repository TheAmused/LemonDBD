// frontend/src/__tests__/unit/shared/tooltipTouch.test.tsx
//
// Tooltips are for a mouse: on a touch screen a tap (which emulates mouseover) or a long press (which
// focuses the control) must not show one. They return once a mouse moves or a key is pressed.
import { act, fireEvent, render, screen } from '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { Tooltip, TooltipProvider, tip } from '@/components/common/Tooltip';

const touch = (el: Element) => fireEvent.pointerDown(el, { pointerType: 'touch' });
const mouse = (el: Element) => fireEvent.pointerMove(el, { pointerType: 'mouse' });

function Page() {
  return (
    <>
      <TooltipProvider />
      <button type="button" {...tip('Provider tip', undefined, 'action')}>global</button>
      <Tooltip title="Wrapper tip" variant="action">
        <button type="button">wrapped</button>
      </Tooltip>
    </>
  );
}

describe('tooltips on touch screens', () => {
  it('a tap or long press shows no tooltip, a mouse does', () => {
    render(<Page />);
    const global = screen.getByText('global');
    const wrapped = screen.getByText('wrapped');

    act(() => void touch(global));
    act(() => void fireEvent.mouseOver(global));
    assert.equal(screen.queryByRole('tooltip'), null, 'emulated mouseover after a tap');

    act(() => void touch(wrapped));
    act(() => void fireEvent.mouseEnter(wrapped.parentElement as Element));
    act(() => void fireEvent.focus(wrapped));
    assert.equal(screen.queryByRole('tooltip'), null, 'wrapper after a tap or long press');

    act(() => void mouse(global));
    act(() => void fireEvent.mouseOver(global));
    assert.equal(screen.getByRole('tooltip').textContent, 'Provider tip');

    act(() => void mouse(wrapped));
    act(() => void fireEvent.mouseOut(global));
    act(() => void fireEvent.mouseLeave(wrapped.parentElement as Element));
    act(() => void fireEvent.mouseEnter(wrapped.parentElement as Element));
    assert.ok(screen.getByRole('tooltip').textContent?.includes('Wrapper tip'));
  });

  it('a touch hides a bubble that is already showing', () => {
    render(<Page />);
    const global = screen.getByText('global');
    act(() => void mouse(global));
    act(() => void fireEvent.mouseOver(global));
    assert.ok(screen.getByRole('tooltip'));
    act(() => void touch(global));
    assert.equal(screen.queryByRole('tooltip'), null);
  });
});
