// frontend/src/__tests__/unit/shared/formValidationProvider.test.tsx
//
// The validation provider replaces the browser's own "Please fill out this field" bubble with the
// site's message, in the site's language, and clears it once the field is fixed.
import { act, fireEvent, render, screen, withDictionary } from '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import pl from '@/locales/pl';
import { FormValidationProvider } from '@/components/common/FormValidation';
import { getValidationMessage } from '@/utils/formValidation';

function renderForm(dict = undefined as never) {
  return render(
    <>
      <FormValidationProvider />
      <form>
        <input aria-label="name" required />
      </form>
    </>,
    { wrapper: withDictionary(dict) }
  );
}

describe('FormValidationProvider', () => {
  it('cancels the native bubble and marks the field invalid', () => {
    renderForm();
    const input = screen.getByLabelText('name') as HTMLInputElement;
    const invalid = new Event('invalid', { cancelable: true });
    act(() => void input.dispatchEvent(invalid));
    assert.equal(invalid.defaultPrevented, true, 'no native bubble');
    assert.equal(input.getAttribute('aria-invalid'), 'true');
  });

  it('shows the site message in the current language', () => {
    renderForm(pl as never);
    const input = screen.getByLabelText('name') as HTMLInputElement;
    act(() => void input.dispatchEvent(new Event('invalid', { cancelable: true })));
    assert.ok(screen.getByRole('alert').textContent?.includes(getValidationMessage(input, pl.validation)));
  });

  it('typing a valid value clears the error state', () => {
    renderForm();
    const input = screen.getByLabelText('name') as HTMLInputElement;
    act(() => void input.dispatchEvent(new Event('invalid', { cancelable: true })));
    fireEvent.input(input, { target: { value: 'Ada' } });
    assert.equal(input.hasAttribute('aria-invalid'), false);
  });
});
