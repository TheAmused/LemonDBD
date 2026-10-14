import { pageMetadata } from '@/i18n/metadata';
import { CharacterDetailClient } from '@/features/characters';

export const generateMetadata = pageMetadata('/characters', (d) => ({ title: d.app.charactersPageTitle }));

export default async function CharacterDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CharacterDetailClient slug={slug} />;
}
