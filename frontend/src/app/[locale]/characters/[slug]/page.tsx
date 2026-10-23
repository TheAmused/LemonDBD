import { pageMetadata, withSegment } from '@/i18n/metadata';
import { CharacterDetailClient } from '@/features/characters';

export const generateMetadata = pageMetadata((p) => withSegment('/characters', p.slug), (d) => ({ title: d.app.charactersPageTitle }));

export default async function CharacterDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CharacterDetailClient slug={slug} />;
}
