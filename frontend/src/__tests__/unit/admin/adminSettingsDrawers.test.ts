import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderWithDictionary } from '@/__tests__/helpers/renderWithDictionary';
import { SettingGroupDrawer } from '@/components/admin/AdminSettingsSection';
import { adminSettingDrawerKey } from '@/components/admin/adminStorage';
import { SETTING_GROUP_ORDER } from '@/components/admin/settingsForm';
import type { AdminSiteSetting } from '@/types/admin';
import type { AdminSettingsDict } from '@/locales/adminSettings';

const mockDict = {
  configUnsaved: '{count} unsaved',
  configModified: 'Modified',
  configCustom: 'Custom',
  configSecuritySwitch: 'Security',
  configDefaultValue: 'Default: {value}',
  configResetDefault: 'Use default',
  configSecretRemove: 'Remove',
  configBannerPreview: 'Banner preview',
  configChoice_true: 'On',
  configChoice_false: 'Off',
  configOn: 'On',
  configOff: 'Off',
  configSecretServer: 'Set on server',
  configSecretNone: 'None',
} as unknown as AdminSettingsDict;

test('adminSettingDrawerKey generates consistent key for each group', () => {
  for (const group of SETTING_GROUP_ORDER) {
    const key = adminSettingDrawerKey(group);
    assert.equal(key, `lemondbd_admin_setting_${group}`);
  }
});

test('SettingGroupDrawer renders clean accordion header with no unsaved badge when pristine', () => {
  const rows: AdminSiteSetting[] = [
    {
      key: 'site_banner_text',
      group: 'notices',
      kind: 'text',
      value: 'Hello World',
      default: '',
      overridden: true,
      min: null,
      max: null,
      max_length: 300,
      choices: [],
      allow_empty: true,
      risky_when: null,
      env_set: false,
    },
  ];

  const html = renderWithDictionary(
    React.createElement(SettingGroupDrawer, {
      group: 'notices',
      rows,
      t: mockDict,
      text: (k: string) => k,
      renderControl: () => React.createElement('input', { type: 'text', defaultValue: 'Hello World' }),
      draftFor: () => 'Hello World',
      isDraftDirty: () => false,
      draftProblem: () => null,
      problemText: () => '',
      defaultLabel: () => '–',
      send: async () => {},
      setRiskyReset: () => {},
      saving: false,
    })
  );

  assert.ok(html.includes('configGroup_notices'));
  assert.ok(!html.includes('unsaved'));
});

test('SettingGroupDrawer displays unsaved badge with correct count when draft is dirty', () => {
  const rows: AdminSiteSetting[] = [
    {
      key: 'site_banner_text',
      group: 'notices',
      kind: 'text',
      value: 'Hello World',
      default: '',
      overridden: true,
      min: null,
      max: null,
      max_length: 300,
      choices: [],
      allow_empty: true,
      risky_when: null,
      env_set: false,
    },
    {
      key: 'site_banner_level',
      group: 'notices',
      kind: 'choice',
      value: 'info',
      default: 'info',
      overridden: false,
      min: null,
      max: null,
      max_length: 50,
      choices: ['info', 'warning', 'critical'],
      allow_empty: false,
      risky_when: null,
      env_set: false,
    },
  ];

  const html = renderWithDictionary(
    React.createElement(SettingGroupDrawer, {
      group: 'notices',
      rows,
      t: mockDict,
      text: (k: string) => k,
      renderControl: () => React.createElement('input', { type: 'text' }),
      draftFor: (r) => (r.key === 'site_banner_text' ? 'New Announcement' : 'info'),
      isDraftDirty: (r, draft) => r.key === 'site_banner_text' && draft !== r.value,
      draftProblem: () => null,
      problemText: () => '',
      defaultLabel: () => '–',
      send: async () => {},
      setRiskyReset: () => {},
      saving: false,
    })
  );

  assert.ok(html.includes('1 unsaved'));
});
