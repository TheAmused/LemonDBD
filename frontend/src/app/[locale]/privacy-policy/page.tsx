// frontend/src/app/[locale]/privacy-policy/page.tsx
import React from 'react';
import { pageMetadata } from '@/i18n/metadata';
import { PrivacyPolicyClient, PRIVACY_SECTION_ORDER } from '@/components/legal/PrivacyPolicyClient';

export { PRIVACY_SECTION_ORDER };

export const generateMetadata = pageMetadata(
  '/privacy-policy',
  (d) => ({
    title: d.privacy.pageTitle,
    description: d.privacy.intro.replace(/<\/?[a-z]+>/gi, ''),
  })
);

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />;
}
