// frontend/src/__tests__/unit/analytics/analyticsMapOpen.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapOpenProps } from '@/utils/mapUtils';

describe('mapOpenProps', () => {
  it('uses the English names, not the localized ones', () => {
    assert.deepEqual(
      mapOpenProps(
        { id: 7, name: 'Azarovs Ruhestätte', raw_name: "Azarov's Resting Place", realm: 'Autowerkstatt', raw_realm: 'Autohaven Wreckers' },
        'browse'
      ),
      { map: "Azarov's Resting Place", map_id: 7, realm: 'Autohaven Wreckers', via: 'browse' }
    );
  });

  it('falls back to name and realm for an old cached payload without raw fields', () => {
    assert.deepEqual(mapOpenProps({ id: 3, name: 'The Game', realm: 'Gideon Meat Plant' }, 'voice'), {
      map: 'The Game',
      map_id: 3,
      realm: 'Gideon Meat Plant',
      via: 'voice',
    });
  });
});
