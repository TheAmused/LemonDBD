// frontend/src/app/[locale]/characters/[slug]/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { CharacterDetailClient } from '@/components/character-detail/CharacterDetailClient';

export const generateMetadata = pageMetadata('/characters', (d) => ({ title: d.app.charactersPageTitle }));

export default async function CharacterDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CharacterDetailClient slug={slug} />;
}
