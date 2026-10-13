// frontend/src/app/[locale]/smash-or-pass/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { SmashOrPassClient } from '@/components/smash-or-pass/SmashOrPassClient';

export const generateMetadata = pageMetadata('/smash-or-pass', (d) => ({
  title: d.app.smashOrPassPageTitle,
  description: d.smashOrPass.subtitle,
}));

export default function SmashOrPassPage() {
  return <SmashOrPassClient />;
}
