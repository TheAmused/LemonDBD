// frontend/src/app/[locale]/smash-or-pass/create/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { SmashRosterCreateClient } from '@/components/smash-or-pass/creator/SmashRosterCreateClient';

export const generateMetadata = pageMetadata('/smash-or-pass/create', (d) => ({
  title: d.app.smashOrPassPageTitle,
  description: d.smashOrPass.subtitle,
}));

export default function SmashRosterCreatePage() {
  return <SmashRosterCreateClient />;
}
