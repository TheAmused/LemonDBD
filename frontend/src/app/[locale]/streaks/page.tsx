import { redirect } from 'next/navigation';

export default async function StreaksIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/streaks/killer`);
}
