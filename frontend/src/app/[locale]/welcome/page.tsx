// frontend/src/app/[locale]/welcome/page.tsx
import React, { Suspense } from 'react';
import { pageMetadata } from '@/i18n/metadata';
import { WelcomeClient } from '@/components/onboarding/WelcomeClient';

export const generateMetadata = pageMetadata('/welcome', (d) => ({ title: d.onboarding.pageTitle }), { noindex: true });

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeClient />
    </Suspense>
  );
}
