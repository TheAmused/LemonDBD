// frontend/src/app/[locale]/user/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { UserProfileClient } from '@/components/user/UserProfileClient';

export const generateMetadata = pageMetadata('/user', (d) => ({ title: d.app.userPageTitle }), { noindex: true });

export default function UserPage() {
  return <UserProfileClient />;
}
