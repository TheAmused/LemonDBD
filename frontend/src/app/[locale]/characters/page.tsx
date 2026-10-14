import { pageMetadata } from '@/i18n/metadata';
import { CharactersClient } from '@/features/characters';

export const generateMetadata = pageMetadata('/characters', (d) => ({ title: d.app.charactersPageTitle }));

export default function CharactersPage() {
  return <CharactersClient />;
}
