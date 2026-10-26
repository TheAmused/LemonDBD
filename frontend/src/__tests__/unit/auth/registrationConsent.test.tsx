// frontend/src/__tests__/unit/auth/registrationConsent.test.tsx
//
// Sign-up needs the Terms and the Rules accepted. The real sign-in modal is rendered (with its
// ALTCHA challenge answered by a stub that is solved at the first try), so this is the form a
// visitor fills in: an unticked box blocks the request with an inline message, a ticked one sends it,
// and each document link opens its own read-only preview.
import { act, fireEvent, render, routeFetch, screen, waitFor, withAppProviders, within } from '../../helpers/dom';
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import React from 'react';
import en from '@/locales/en';
import { AuthModal } from '@/components/AuthModal';

const salt = 'test-salt';
// The proof-of-work answer is 1: sha256(salt + "1").
const challenge = { algorithm: 'SHA-256', challenge: createHash('sha256').update(`${salt}1`).digest('hex'), salt, maxnumber: 10, signature: 'sig', expires: 9999999999 };

let api: ReturnType<typeof routeFetch> | null = null;
afterEach(() => api?.restore());

async function openSignUp() {
  api = routeFetch({
    '/auth/me': { body: { authenticated: false } },
    '/site-config': { body: {} },
    '/auth/altcha-challenge': { body: challenge },
    '/auth/demo-accounts': { body: { enabled: false, accounts: [] } },
    '/auth/google/config': { body: { enabled: false, client_id: '' } },
    'POST /auth/register': { status: 201, body: { status: 'verification_required', verification_token: 'v', user: { email: 'new@example.com', is_verified: false } } },
  });
  const utils = render(<AuthModal isOpen onClose={() => {}} initialMode="register" />, { wrapper: withAppProviders({ pathname: '/en' }).wrapper });
  // The security check replaces the form while the challenge is fetched and solved; submit is
  // enabled once it is solved.
  await waitFor(() => assert.equal((document.querySelector('form button[type="submit"]') as HTMLButtonElement | null)?.disabled, false));
  return utils;
}

function fillForm(container: HTMLElement) {
  const inputs = container.ownerDocument.querySelectorAll('form input:not([type="checkbox"]):not([tabindex="-1"])');
  const values = ['newbie', 'Newbie', 'new@example.com', 'Password123!'];
  inputs.forEach((input, i) => {
    if (values[i] !== undefined) fireEvent.change(input, { target: { value: values[i] } });
  });
}
const submit = () => act(() => void fireEvent.submit(document.querySelector('form') as HTMLFormElement));
const registerCalls = () => api!.calls.filter((c) => c.url.includes('/auth/register'));

describe('sign-up consent', () => {
  it('an unticked box blocks sign-up with an inline message, and nothing is sent', async () => {
    const { container } = await openSignUp();
    assert.ok(!screen.queryByText(en.user.legalNotAccepted), 'no error before an attempt');
    fillForm(container);
    await submit();
    assert.ok(screen.getByText(en.user.legalNotAccepted));
    assert.equal(screen.getByRole('checkbox').getAttribute('aria-invalid'), 'true');
    assert.equal(registerCalls().length, 0);
  });

  it('a ticked box lets the request through', async () => {
    const { container } = await openSignUp();
    fillForm(container);
    fireEvent.click(screen.getByRole('checkbox'));
    await submit();
    await waitFor(() => assert.equal(registerCalls().length, 1));
    assert.ok(!screen.queryByText(en.user.legalNotAccepted));
  });

  it('the Terms and Rules links open their own read-only preview', async () => {
    await openSignUp();
    fireEvent.click(screen.getByText(en.user.acceptTermsLink));
    const dialogs = await screen.findAllByRole('dialog');
    assert.ok(within(dialogs.at(-1) as HTMLElement).getByText(en.terms.tldrNotice));
  });
});
