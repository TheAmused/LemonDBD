// frontend/src/__tests__/unit/format.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatDate, formatDateTime, formatNumber } from '@/utils/format';

describe('format helpers', () => {
  it('formatDate returns empty string for empty / invalid input', () => {
    assert.strictEqual(formatDate(null), '');
    assert.strictEqual(formatDate(undefined), '');
    assert.strictEqual(formatDate(''), '');
    assert.strictEqual(formatDate('not a date'), '');
  });

  it('formatDate matches toLocaleDateString for the same locale/options', () => {
    const iso = '2025-03-14T12:00:00Z';
    const opts = { month: 'short', day: 'numeric', year: 'numeric' } as const;
    assert.strictEqual(formatDate(iso, 'en-US', opts), new Date(iso).toLocaleDateString('en-US', opts));
    assert.strictEqual(formatDate(iso, 'en-US', opts), 'Mar 14, 2025');
    assert.strictEqual(formatDate(new Date(iso), 'en-US'), new Date(iso).toLocaleDateString('en-US'));
  });

  it('formatDateTime matches toLocaleString', () => {
    const iso = '2025-03-14T12:00:00Z';
    assert.strictEqual(formatDateTime(iso, 'en-US'), new Date(iso).toLocaleString('en-US'));
    assert.strictEqual(formatDateTime(null), '');
  });

  it('formatNumber groups digits like toLocaleString', () => {
    assert.strictEqual(formatNumber(1234567, 'en-US'), '1,234,567');
    assert.strictEqual(formatNumber(1.234, 'en-US', { maximumFractionDigits: 1 }), '1.2');
  });
});
