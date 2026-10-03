// frontend/src/utils/dictionaryPath.ts
//
// Server components (loading.tsx) can't read the dictionary, but they can name a key. A client
// component such as <DbdSpinner labelKey="app.loadingPerks" /> resolves it, so no label is ever
// hardcoded English. Paths are `namespace.key`, type-checked against the Dictionary.
import type { Dictionary } from '@/locales/types';

export type DictionaryPath = {
  [N in keyof Dictionary]: {
    [K in keyof Dictionary[N]]: Dictionary[N][K] extends string ? `${N & string}.${K & string}` : never;
  }[keyof Dictionary[N]];
}[keyof Dictionary];

export function resolveDictionaryPath(dict: Dictionary, path: DictionaryPath | undefined): string | undefined {
  if (!path) return undefined;
  const [ns, key] = path.split('.') as [keyof Dictionary, string];
  return (dict[ns] as Record<string, string>)[key];
}
