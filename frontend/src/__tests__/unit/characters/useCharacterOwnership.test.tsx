// frontend/src/__tests__/unit/characters/useCharacterOwnership.test.tsx
//
// "My characters" mode: a failed load never opens the mode (it once showed every character as
// owned), and unsaved changes are never dropped silently.
import { act, renderHook, routeFetch, TEST_USER, waitFor, withAppProviders } from '../../helpers/dom';
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import en from '@/locales/en';
import { useCharacterOwnership } from '@/components/characters/hub/useCharacterOwnership';
import { useAuth } from '@/context/AuthContext';

const ownedCharacters = { data: [{ id: 4, name: 'Meg Thomas', role: 'survivor', is_owned: true }] };
let api: ReturnType<typeof routeFetch> | null = null;
afterEach(() => api?.restore());

async function mount(routes: Parameters<typeof routeFetch>[0], calls = { login: 0, verify: 0 }) {
  api = routeFetch({ '/auth/me': { body: { authenticated: true, user: TEST_USER } }, '/site-config': { body: {} }, ...routes });
  const both = renderHook(
    () => ({
      auth: useAuth(),
      own: useCharacterOwnership({ locale: 'en', onLoginRequired: () => void calls.login++, onVerificationRequired: () => void calls.verify++ }),
    }),
    { wrapper: withAppProviders().wrapper }
  );
  // Wait until /auth/me has answered and the session is known.
  await waitFor(() => assert.equal(both.result.current.auth.isLoading, false));
  return { result: { get current() { return both.result.current.own; } } };
}

describe('useCharacterOwnership', () => {
  it('a failed load reports an error and does not open the mode', async () => {
    const hook = await mount({ '/users/1/characters': { status: 500, body: {} }, '/users/1/perks': { body: { data: [] } } });
    await act(() => hook.result.current.handleToggleOwnershipMode());
    assert.equal(hook.result.current.ownershipMode, false);
    assert.equal(hook.result.current.ownershipLoadError, en.characterDetail.loadOwnershipError);
  });

  it('leaving with unsaved changes asks first, and a reload is warned against', async () => {
    const hook = await mount({ '/users/1/characters': { body: ownedCharacters }, '/users/1/perks': { body: { data: [] } } });
    await act(() => hook.result.current.handleToggleOwnershipMode());
    assert.equal(hook.result.current.ownershipMode, true);

    act(() => hook.result.current.handleToggleCharacterOwned(4, 'survivor'));
    const reload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(reload);
    assert.equal(reload.defaultPrevented, true, 'a reload with a draft is warned against');

    await act(() => hook.result.current.handleToggleOwnershipMode());
    assert.equal(hook.result.current.discardConfirmOpen, true);
    assert.equal(hook.result.current.ownershipMode, true, 'still editing until the person confirms');
  });

  it('leaving without changes just closes the mode, with no warning on reload', async () => {
    const hook = await mount({ '/users/1/characters': { body: ownedCharacters }, '/users/1/perks': { body: { data: [] } } });
    await act(() => hook.result.current.handleToggleOwnershipMode());
    const reload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(reload);
    assert.equal(reload.defaultPrevented, false);
    await act(() => hook.result.current.handleToggleOwnershipMode());
    assert.equal(hook.result.current.ownershipMode, false);
    assert.equal(hook.result.current.discardConfirmOpen, false);
  });

  it('a signed-out visitor is sent to sign in instead', async () => {
    const calls = { login: 0, verify: 0 };
    const hook = await mount({ '/auth/me': { body: { authenticated: false } } }, calls);
    await act(() => hook.result.current.handleToggleOwnershipMode());
    assert.equal(calls.login, 1);
    assert.equal(hook.result.current.ownershipMode, false);
  });
});
