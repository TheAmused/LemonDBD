// frontend/src/__tests__/unit/settings/profileForm.test.tsx
//
// The account form's request body. A wrong key once sent the new password as `password`, which the
// API ignores; and a change of e-mail or password must carry the current password, or not be sent.
import { act, fireEvent, render, routeFetch, screen, TEST_USER, waitFor, withAppProviders } from '../../helpers/dom';
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import en from '@/locales/en';
import { UserProfileForm } from '@/components/user/UserProfileForm';
import { SESSION_FLAG_KEY } from '@/utils/api';

let api: ReturnType<typeof routeFetch> | null = null;
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(SESSION_FLAG_KEY, '1');
  localStorage.setItem('lemondbd_drawer_account', 'true'); // the account drawer starts open
});
afterEach(() => api?.restore());

function renderForm() {
  api = routeFetch({
    '/auth/me': { body: { authenticated: true, user: TEST_USER } },
    '/site-config': { body: {} },
    'PUT /auth/profile': { body: { verification_required: false } },
  });
  render(<UserProfileForm login="alice" initialUsername="Alice" initialEmail="alice@example.com" onRefreshUser={async () => {}} />, {
    wrapper: withAppProviders().wrapper,
  });
}

/** The input that follows a visible label (the password fields have no `for`). */
const inputAfter = (label: string) => screen.getByText(label).closest('div')?.querySelector('input') as HTMLInputElement;
const type = (input: HTMLInputElement, value: string) => fireEvent.change(input, { target: { value } });
const submit = () => act(() => void fireEvent.submit(document.querySelector('form') as HTMLFormElement));
const profileCalls = () => api!.calls.filter((c) => c.url.includes('/auth/profile'));

describe('account form request', () => {
  it('a password change without the current password is refused and nothing is sent', async () => {
    renderForm();
    type(inputAfter(en.user.newPassword), 'BrandNew123!');
    type(inputAfter(en.user.confirmPassword), 'BrandNew123!');
    await submit();
    assert.ok(screen.getByText(en.user.currentPasswordRequired));
    assert.equal(profileCalls().length, 0);
  });

  it('sends the new password as new_password, with the current password', async () => {
    renderForm();
    type(inputAfter(en.user.newPassword), 'BrandNew123!');
    type(inputAfter(en.user.confirmPassword), 'BrandNew123!');
    type(document.getElementById('profile-current-password') as HTMLInputElement, 'OldPass123!');
    await submit();
    await waitFor(() => assert.equal(profileCalls().length, 1));
    const body = profileCalls()[0].body as Record<string, unknown>;
    assert.equal(body.new_password, 'BrandNew123!');
    assert.equal(body.current_password, 'OldPass123!');
    assert.ok(!('password' in body), 'never under `password`, which the API ignores');
  });

  it('nothing changed: nothing is sent', async () => {
    renderForm();
    await submit();
    assert.equal(profileCalls().length, 0);
  });
});
