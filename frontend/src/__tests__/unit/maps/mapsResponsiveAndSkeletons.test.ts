// frontend/src/__tests__/unit/maps/mapsResponsiveAndSkeletons.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { MapsPageSkeleton } from '@/components/maps/MapsSkeleton';
import enDict from '@/locales/en';
import deDict from '@/locales/de';
import esDict from '@/locales/es';
import jaDict from '@/locales/ja';
import plDict from '@/locales/pl';
import { renderWithDictionary } from '../../helpers/renderWithDictionary';

describe('Maps: Skeletons & DBD Framer Motion Spinner Integrity', () => {
  it('MapsPageSkeleton renders with role="status", aria-busy="true", and DBD Skill Check Spinner', () => {
    const html = renderWithDictionary(
      React.createElement(MapsPageSkeleton, {
      })
    );

    assert.ok(html.includes('<output'), 'Skeleton should declare a status region (<output>)');
    assert.ok(html.includes('aria-busy="true"'), 'Skeleton should declare aria-busy="true"');
    assert.ok(html.includes('viewBox="0 0 160 160"'), 'Maps skeleton must render DBD Skill Check SVG');
  });
});




