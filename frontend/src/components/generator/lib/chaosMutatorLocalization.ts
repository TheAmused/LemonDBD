// frontend/src/components/generator/lib/chaosMutatorLocalization.ts
import type { Dictionary } from '@/locales/types';
import type { ChaosMutator } from '@/types/chaos';

export interface LocalizedMutatorInfo {
  name: string;
  description: string;
  effect: string;
  lines: [string, string];
}

export function getLocalizedMutator(
  mutator: ChaosMutator | string | null | undefined,
  dict?: Dictionary
): LocalizedMutatorInfo {
  if (!mutator) {
    return { name: '', description: '', effect: '', lines: ['', ''] };
  }
  const id = typeof mutator === 'string' ? mutator : mutator.id;
  const fallbackName = typeof mutator === 'string' ? mutator : mutator.name;
  const fallbackDesc = typeof mutator === 'string' ? '' : mutator.description;
  const fallbackEffect = typeof mutator === 'string' ? '' : mutator.effect || '';

  const loc = (dict?.generator as any)?.chaosMutators?.[id];
  if (loc) {
    return {
      name: loc.name || fallbackName,
      description: loc.description || fallbackDesc,
      effect: loc.effect || fallbackEffect,
      lines: [loc.line1 || '', loc.line2 || ''],
    };
  }

  return {
    name: fallbackName,
    description: fallbackDesc,
    effect: fallbackEffect,
    lines: [fallbackName, ''],
  };
}
