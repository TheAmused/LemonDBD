// frontend/src/components/scraper-config/useLocalizedTargets.ts
import { useMemo } from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import { ALL_TARGETS, TARGET_KEY_MAP } from './scraperTargets';

/** ALL_TARGETS with label/description overridden by the admin dictionary where a translation exists. */
export function useLocalizedTargets() {
  const dict = useDictionary();

  return useMemo(() => {
    const adminDict = (dict.admin || {}) as Record<string, string>;
    return ALL_TARGETS.map((target) => {
      const pascal = TARGET_KEY_MAP[target.id];
      return {
        ...target,
        label: adminDict[`target${pascal}Label`] || target.label,
        desc: adminDict[`target${pascal}Desc`] || target.desc,
      };
    });
  }, [dict]);
}
