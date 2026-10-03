// Safe string-keyed access into typed dictionary tables (e.g. `dict.modes[mode]` where `mode` comes from data).

/** Localized copy for one chaos mutator (all fields optional: older locales may omit some). */
export interface ChaosMutatorCopy {
  name?: string;
  description?: string;
  effect?: string;
  line1?: string;
  line2?: string;
}

/** Own-property lookup that returns undefined for missing keys (and prototype names like "constructor"). */
export function lookup<T>(table: object | null | undefined, key: string): T | undefined {
  if (!table || !Object.prototype.hasOwnProperty.call(table, key)) return undefined;
  return (table as Record<string, T>)[key];
}
