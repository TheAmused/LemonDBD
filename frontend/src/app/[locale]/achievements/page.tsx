// frontend/src/app/[locale]/achievements/page.tsx
import React from 'react';
import { pageMetadata } from '@/i18n/metadata';
import { AchievementsHub } from '@/components/achievements/AchievementsHub';

export const generateMetadata = pageMetadata('/achievements', (d) => ({ title: d.app.achievementsPageTitle }));

export default function AchievementsPage() {
  return <AchievementsHub />;
}
