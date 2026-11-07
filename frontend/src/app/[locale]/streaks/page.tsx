import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Locale } from '@/i18n/config';
import { STREAK_ROLE_COOKIE, resolveStreakRole } from '@/utils/streakRole';

/** Fallback only: proxy.ts already redirects a bare /streaks before anything renders (a redirect from here
 * arrives after the layout has streamed, so the tabs flash the wrong role first). */
export default async function StreaksIndexPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const role = resolveStreakRole(cookieStore.get(STREAK_ROLE_COOKIE)?.value);
  redirect(`/${locale}/streaks/${role}`);
}
