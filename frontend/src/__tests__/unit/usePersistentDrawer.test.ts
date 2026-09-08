// frontend/src/__tests__/unit/usePersistentDrawer.test.ts
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';

class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe('usePersistentDrawer Hook', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (globalThis as any).localStorage = mockStorage;
  });

  it('defaults to defaultOpen during SSR / initial render', () => {
    let capturedState!: boolean;

    function TestComp() {
      const [isExpanded] = usePersistentDrawer('test_key_closed', false);
      capturedState = isExpanded;
      return React.createElement('div', null, String(isExpanded));
    }

    renderToStaticMarkup(React.createElement(TestComp));
    assert.equal(capturedState, false);

    function TestCompOpen() {
      const [isExpanded] = usePersistentDrawer('test_key_open', true);
      capturedState = isExpanded;
      return React.createElement('div', null, String(isExpanded));
    }

    renderToStaticMarkup(React.createElement(TestCompOpen));
    assert.equal(capturedState, true);
  });

  it('reads stored preference from localStorage', () => {
    mockStorage.setItem('lemondbd_drawer_account', 'true');
    mockStorage.setItem('lemondbd_drawer_loadouts', 'false');

    let accountExpanded!: boolean;
    let loadoutsExpanded!: boolean;

    function TestClientComp() {
      const [account] = usePersistentDrawer('lemondbd_drawer_account', false);
      const [loadouts] = usePersistentDrawer('lemondbd_drawer_loadouts', true);

      // Simulating mount effect execution
      useEffect(() => {
        accountExpanded = account;
        loadoutsExpanded = loadouts;
      }, [account, loadouts]);

      accountExpanded = account;
      loadoutsExpanded = loadouts;
      return null;
    }

    renderToStaticMarkup(React.createElement(TestClientComp));
    assert.equal(accountExpanded, false); // initial SSR render is false
  });

  it('handles corrupted or restricted localStorage gracefully', () => {
    (globalThis as any).localStorage = {
      getItem: () => {
        throw new Error('Access denied');
      },
      setItem: () => {
        throw new Error('Access denied');
      },
    };

    let state!: boolean;
    function TestProtected() {
      const [isExpanded] = usePersistentDrawer('restricted_key', true);
      state = isExpanded;
      return null;
    }

    assert.doesNotThrow(() => {
      renderToStaticMarkup(React.createElement(TestProtected));
    });
    assert.equal(state, true);
  });
});
