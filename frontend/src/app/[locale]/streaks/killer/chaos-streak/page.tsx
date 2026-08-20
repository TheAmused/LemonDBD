// frontend/src/app/[locale]/streaks/killer/chaos-streak/page.tsx
import { ChaosBoard } from '@/components/streaks/chaos/ChaosBoard';

export default async function ChaosStreakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <ChaosBoard locale={locale} />;
}
