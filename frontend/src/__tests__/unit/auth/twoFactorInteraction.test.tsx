// frontend/src/__tests__/unit/auth/twoFactorInteraction.test.tsx
//
// The six-box code input and the recovery-codes panel, used the way a person uses them.
import { fireEvent, render, screen, withDictionary } from '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import en from '@/locales/en';
import { CodeInput } from '@/components/auth/CodeInput';
import { RecoveryCodesPanel } from '@/components/user/RecoveryCodesPanel';

function ControlledCode({ seen }: { seen: string[] }) {
  const [value, setValue] = useState('');
  return (
    <CodeInput
      value={value}
      onChange={(next) => {
        seen.push(next);
        setValue(next);
      }}
    />
  );
}

const boxes = () => screen.getAllByRole('textbox') as HTMLInputElement[];

describe('CodeInput', () => {
  it('keeps only digits when typing', () => {
    const seen: string[] = [];
    render(<ControlledCode seen={seen} />, { wrapper: withDictionary() });
    fireEvent.change(boxes()[0], { target: { value: 'a' } });
    fireEvent.change(boxes()[0], { target: { value: '7' } });
    assert.deepEqual(seen, ['', '7']);
    assert.equal(boxes()[0].value, '7');
  });

  it('a pasted code fills the boxes with its digits only', () => {
    const seen: string[] = [];
    render(<ControlledCode seen={seen} />, { wrapper: withDictionary() });
    fireEvent.paste(boxes()[0].parentElement as HTMLElement, { clipboardData: { getData: () => '12-34 56' } });
    assert.equal(seen.at(-1), '123456');
    assert.deepEqual(boxes().map((b) => b.value), ['1', '2', '3', '4', '5', '6']);
  });

  it('an autofilled multi-digit value spreads across the boxes', () => {
    const seen: string[] = [];
    render(<ControlledCode seen={seen} />, { wrapper: withDictionary() });
    fireEvent.change(boxes()[0], { target: { value: '9876' } });
    assert.equal(seen.at(-1), '9876');
  });

  it('a letter key is blocked before it reaches the box; digits and shortcuts are not', () => {
    render(<ControlledCode seen={[]} />, { wrapper: withDictionary() });
    assert.equal(fireEvent.keyDown(boxes()[0], { key: 'x' }), false, 'letter prevented');
    assert.equal(fireEvent.keyDown(boxes()[0], { key: '5' }), true);
    assert.equal(fireEvent.keyDown(boxes()[0], { key: 'v', ctrlKey: true }), true, 'paste shortcut allowed');
  });
});

describe('RecoveryCodesPanel', () => {
  it('cannot be dismissed until the person confirms they saved the codes', () => {
    let done = 0;
    render(<RecoveryCodesPanel codes={['ABCDE-12345', 'FGHJK-67890']} onDone={() => void (done += 1)} />, { wrapper: withDictionary() });
    const doneButton = screen.getByRole('button', { name: en.twoFactor.doneButton }) as HTMLButtonElement;
    assert.equal(doneButton.disabled, true);
    fireEvent.click(screen.getByRole('checkbox'));
    assert.equal(doneButton.disabled, false);
    fireEvent.click(doneButton);
    assert.equal(done, 1);
  });
});
