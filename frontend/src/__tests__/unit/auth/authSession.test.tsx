// frontend/src/__tests__/unit/auth/authSession.test.tsx
//
// AuthContext adopts a session only when the server actually created one. A password that still
// needs an authenticator code, an address that still needs confirming, or a sign-up waiting for
// its e-mail code must leave the visitor signed out.
import { act, renderHook, stubFetch, waitFor, withDictionary } from '../../helpers/dom';
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SESSION_FLAG_KEY } from '@/utils/api';

const user = { id: 1, login: 'alice', username: 'Alice', email: 'a@example.com', role: 'user', is_verified: true, onboarding_completed_at: '2026-01-01' };
type Answers = Record<string, { status?: number; body: unknown }>;

let answers: Answers = {};
let api: ReturnType<typeof stubFetch>;

beforeEach(() => {
  localStorage.clear();
  answers = { '/auth/me': { body: { authenticated: false } } };
  api = stubFetch((call) => {
    const key = Object.keys(answers).find((path) => call.url.includes(`/api/v1${path}`) && !call.url.includes(`/api/v1${path}/`));
    const answer = key ? answers[key] : { status: 404, body: {} };
    return new Response(JSON.stringify(answer.body), { status: answer.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  });
});
afterEach(() => api.restore());

async function mountAuth() {
  const wrapper = ({ children }: { children: React.ReactNode }) => withDictionary()({ children: <AuthProvider>{children}</AuthProvider> });
  const hook = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => assert.equal(hook.result.current.isLoading, false));
  return hook;
}

const signedIn = (hook: Awaited<ReturnType<typeof mountAuth>>) =>
  hook.result.current.user !== null || localStorage.getItem(SESSION_FLAG_KEY) === '1';

describe('AuthContext: when a session is adopted', () => {
  it('a password accepted with "two_factor_required" returns the challenge and adopts nothing', async () => {
    answers['/auth/login'] = { body: { status: 'two_factor_required', two_factor_token: 'tf-1' } };
    const hook = await mountAuth();
    let result: Awaited<ReturnType<typeof hook.result.current.login>> | undefined;
    await act(async () => void (result = await hook.result.current.login('alice', 'pw')));
    assert.equal(result?.twoFactorToken, 'tf-1');
    assert.equal(signedIn(hook), false);
  });

  it('a login refused with "email_not_verified" returns the verification step and adopts nothing', async () => {
    answers['/auth/login'] = { status: 403, body: { error_code: 'email_not_verified', verification_token: 'v-1', email: 'a@example.com' } };
    const hook = await mountAuth();
    let result: Awaited<ReturnType<typeof hook.result.current.login>> | undefined;
    await act(async () => void (result = await hook.result.current.login('alice', 'pw')));
    assert.deepEqual(result?.verification, { email: 'a@example.com', token: 'v-1' });
    assert.equal(signedIn(hook), false);
  });

  it('a sign-up that needs its e-mail code first succeeds without a session', async () => {
    answers['/auth/register'] = { status: 201, body: { status: 'verification_required', verification_token: 'v-2', user: { ...user, is_verified: false } } };
    const hook = await mountAuth();
    let result: Awaited<ReturnType<typeof hook.result.current.register>> | undefined;
    await act(async () => void (result = await hook.result.current.register('alice', 'Alice', 'a@example.com', 'pw')));
    assert.equal(result?.success, true);
    assert.equal(result?.verification?.token, 'v-2');
    assert.equal(signedIn(hook), false);
  });

  it('confirming the address of an account with 2FA still waits for the code', async () => {
    answers['/auth/verify-email'] = { body: { status: 'two_factor_required', two_factor_token: 'tf-2' } };
    const hook = await mountAuth();
    let result: Awaited<ReturnType<typeof hook.result.current.verifyEmail>> | undefined;
    await act(async () => void (result = await hook.result.current.verifyEmail('a@example.com', '123456', 'v-1')));
    assert.equal(result?.twoFactorToken, 'tf-2');
    assert.equal(signedIn(hook), false);
  });

  it('a successful login, and a successful second step, adopt the session', async () => {
    answers['/auth/login'] = { body: { user } };
    const hook = await mountAuth();
    await act(async () => void (await hook.result.current.login('alice', 'pw')));
    assert.equal(hook.result.current.user?.login, 'alice');
    assert.equal(localStorage.getItem(SESSION_FLAG_KEY), '1');

    act(() => hook.result.current.logout());
    assert.equal(signedIn(hook), false);
    answers['/auth/login/two-factor'] = { body: { user } };
    await act(async () => void (await hook.result.current.completeTwoFactorLogin('tf-1', '123456')));
    assert.equal(hook.result.current.user?.login, 'alice');
  });

  it('the signed-in state on load comes from /auth/me', async () => {
    answers['/auth/me'] = { body: { authenticated: true, user } };
    const hook = await mountAuth();
    assert.equal(hook.result.current.user?.login, 'alice');
  });
});
