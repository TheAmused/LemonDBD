import { pageMetadata } from '@/i18n/metadata';
import { UserProfileClient } from '@/features/auth';

export const generateMetadata = pageMetadata('/user', (d) => ({ title: d.app.userPageTitle }), { noindex: true });

export default function UserPage() {
  return <UserProfileClient />;
}
