import { RoleCategory, DrawnSlot, GeneratorMode } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';

export const GENERATOR_STORAGE_KEY = 'lemon_dbd_generator_v8';

export interface GeneratorStoredState {
  role: RoleCategory;
  genMode: GeneratorMode;
  noRepeatPerks: boolean;
  spinDurationSec: number;
  loadout: (DrawnSlot | null)[];
  activeSlotIdx: number;
  blindMode: boolean;
  activeMutator: ChaosMutator | null;
}

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {}
  return null;
}

export function safeGetJSON<T>(key: string, fallback: T): T {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    if (
      typeof fallback === 'object' &&
      !Array.isArray(fallback) &&
      fallback !== null &&
      (typeof parsed !== 'object' || Array.isArray(parsed))
    ) {
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function safeSetJSON(key: string, value: unknown): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const serialized = JSON.stringify(value);
    storage.setItem(key, serialized);
    return true;
  } catch (err: unknown) {
    console.warn(`[generatorStorage] Failed saving to localStorage (${key}):`, err);
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {}
}

export function getDrawnPerksForRole(role: RoleCategory): string[] {
  const drawn = safeGetJSON<string[]>(`lemon_drawn_perks_${role}`, []);
  return drawn.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
}

export function saveDrawnPerksForRole(role: RoleCategory, perks: string[]): boolean {
  const unique = Array.from(new Set(perks.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)));
  return safeSetJSON(`lemon_drawn_perks_${role}`, unique);
}

export function clearDrawnPerksForRole(role: RoleCategory): void {
  safeRemoveItem(`lemon_drawn_perks_${role}`);
}

export function getActiveMutatorForRole(role: RoleCategory): ChaosMutator | null {
  const mutator = safeGetJSON<ChaosMutator | null>(`lemon_active_mutator_${role}`, null);
  if (mutator && typeof mutator === 'object' && mutator.id) {
    return mutator;
  }
  return null;
}

export function saveActiveMutatorForRole(role: RoleCategory, mutator: ChaosMutator | null): void {
  const key = `lemon_active_mutator_${role}`;
  if (mutator) {
    safeSetJSON(key, mutator);
  } else {
    safeRemoveItem(key);
  }
}

export function getStoredGeneratorState(): Partial<GeneratorStoredState> | null {
  const state = safeGetJSON<Partial<GeneratorStoredState> | null>(GENERATOR_STORAGE_KEY, null);
  if (state && typeof state === 'object' && !Array.isArray(state)) {
    return state;
  }
  return null;
}


export function saveStoredGeneratorState(state: GeneratorStoredState): boolean {
  return safeSetJSON(GENERATOR_STORAGE_KEY, state);
}
