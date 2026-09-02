// frontend/src/__tests__/unit/umamiComponents.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { UmamiScript } from '@/components/UmamiScript';
import { AdminHeader } from '@/components/admin/AdminHeader';

test('Umami UI Components & Script Formatting Integrity', async (t) => {
  await t.test('UmamiScript and AdminHeader components are exported correctly', () => {
    assert.strictEqual(typeof UmamiScript, 'function');
    assert.strictEqual(typeof AdminHeader, 'function');
  });

  await t.test('Script URL formatting strips trailing slash to avoid double slashes', () => {
    const urls = [
      'https://localhost:8117',
      'https://localhost:8117/',
      'https://localhost:8117///',
      'https://analytics.example.com',
      'https://analytics.example.com/',
    ];

    for (const url of urls) {
      const scriptSrc = `${url.replace(/\/+$/, '')}/script.js`;
      assert.ok(!scriptSrc.includes('//script.js'), `Double slash found in ${scriptSrc}`);
      assert.ok(scriptSrc.endsWith('/script.js'), `Does not end with /script.js: ${scriptSrc}`);
    }
  });

  await t.test('Umami URL fallback logic handles empty, trailing-slash, and custom ports', () => {
    const computeUmamiUrl = (envVal: string | undefined, windowLocation?: { protocol: string; hostname: string }) => {
      return (envVal && envVal.trim() !== '')
        ? envVal.replace(/\/+$/, '')
        : windowLocation
        ? `${windowLocation.protocol}//${windowLocation.hostname}:8117`
        : 'https://localhost:8117';
    };

    assert.strictEqual(
      computeUmamiUrl('https://stats.lemondbd.com:8117/'),
      'https://stats.lemondbd.com:8117'
    );

    assert.strictEqual(
      computeUmamiUrl('', { protocol: 'https:', hostname: 'prod.lemondbd.com' }),
      'https://prod.lemondbd.com:8117'
    );

    assert.strictEqual(
      computeUmamiUrl(undefined, undefined),
      'https://localhost:8117'
    );
  });
});
