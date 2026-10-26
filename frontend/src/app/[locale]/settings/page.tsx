// frontend/src/app/[locale]/settings/page.tsx
import React from 'react';
import { pageMetadata } from '@/i18n/metadata';
import { SettingsClient } from './SettingsClient';

export const generateMetadata = pageMetadata('/settings', (d) => ({
  title: d.settings.pageTitle,
  description: d.settings.subtitle,
}));

export default function SettingsPage() {
  return <SettingsClient />;
}
