// frontend/src/__tests__/unit/admin/useUserModeration.test.tsx
//
// The moderation drawer's data hook. It loads one account's sanctions; when the admin switches
// accounts while a request is still in flight, the late answer must never be shown (it would also
// suggest the wrong next sanction) for the account now open.
import { deferred, renderHook, stubFetch, waitFor, withDictionary } from '../../helpers/dom';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useUserModeration } from '@/components/admin/useUserModeration';
import type { UserSanctions } from '@/types/moderation';

/** A history recognisable by its first (fake) sanction id. */
const historyFor = (userId: number) => ({ sanctions: [{ id: userId * 100 }], summary: {} }) as unknown as UserSanctions;
const firstSanctionId = (data: UserSanctions | null) => (data?.sanctions[0] as { id: number } | undefined)?.id;

function mount(userId: number | null) {
  return renderHook(
    (props: { userId: number | null }) =>
      useUserModeration({ userId: props.userId, username: 'player', onChanged: () => {}, onActionMessage: () => {} }),
    { wrapper: withDictionary(), initialProps: { userId } }
  );
}

describe('useUserModeration', () => {
  it('shows the history of the account that is open', async () => {
    const api = stubFetch((call) => historyFor(Number(call.url.match(/users\/(\d+)\//)?.[1])));
    try {
      const { result } = mount(7);
      await waitFor(() => assert.equal(firstSanctionId(result.current.data), 700));
      assert.equal(result.current.loading, false);
      assert.ok(api.calls[0].url.endsWith('/api/v1/admin/users/7/sanctions'));
    } finally {
      api.restore();
    }
  });

  it('drops a late answer for the account that was open before', async () => {
    const slowFirst = deferred<UserSanctions>();
    const api = stubFetch((call) => (call.url.includes('/users/1/') ? slowFirst.promise : historyFor(2)));
    try {
      const { result, rerender } = mount(1);
      rerender({ userId: 2 });
      await waitFor(() => assert.equal(firstSanctionId(result.current.data), 200));
      slowFirst.resolve(historyFor(1));
      await new Promise((r) => setTimeout(r, 20));
      assert.equal(firstSanctionId(result.current.data), 200);
    } finally {
      api.restore();
    }
  });

  it('shows nothing from the previous account while the next one loads', async () => {
    const second = deferred<UserSanctions>();
    const api = stubFetch((call) => (call.url.includes('/users/1/') ? historyFor(1) : second.promise));
    try {
      const { result, rerender } = mount(1);
      await waitFor(() => assert.equal(firstSanctionId(result.current.data), 100));
      rerender({ userId: 2 });
      assert.equal(result.current.data, null);
      assert.equal(result.current.loading, true);
      second.resolve(historyFor(2));
      await waitFor(() => assert.equal(firstSanctionId(result.current.data), 200));
    } finally {
      api.restore();
    }
  });

  it('a failed load is reported for that account only', async () => {
    const api = stubFetch(() => new Response('{}', { status: 500 }));
    try {
      const { result } = mount(3);
      await waitFor(() => assert.equal(result.current.loadFailed, true));
      assert.equal(result.current.data, null);
    } finally {
      api.restore();
    }
  });
});
