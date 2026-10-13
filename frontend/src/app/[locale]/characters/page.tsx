// frontend/src/app/[locale]/characters/page.tsx
import { pageMetadata } from '@/i18n/metadata';
import { CharactersClient } from '@/components/character-detail/CharactersClient';

export const generateMetadata = pageMetadata('/characters', (d) => ({ title: d.app.charactersPageTitle }));

export default function CharactersPage() {
  return <CharactersClient />;
}
