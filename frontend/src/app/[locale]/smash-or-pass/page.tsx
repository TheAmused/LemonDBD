import { pageMetadata } from '@/i18n/metadata';
import { SmashOrPassClient } from '@/features/smash-or-pass';

export const generateMetadata = pageMetadata('/smash-or-pass', (d) => ({
  title: d.app.smashOrPassPageTitle,
  description: d.smashOrPass.subtitle,
}));

export default function SmashOrPassPage() {
  return <SmashOrPassClient />;
}
