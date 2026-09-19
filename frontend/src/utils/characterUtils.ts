// frontend/src/utils/characterUtils.ts

export function sortByReleaseNumber<T extends { release_number?: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.release_number ?? Infinity) - (b.release_number ?? Infinity));
}

/**
 * A character's identity, as one string.
 *
 * Survivors and killers are separate tables with their own id sequences, so
 * survivor 7 (Ace Visconti) and killer 7 (The Doctor) both exist. Anything
 * that keys a map, a draft or a lookup by character has to key it by the pair,
 * and `"survivor:7"` is that pair in a form a Record can use.
 */
export function ownershipKey(characterId: number, role?: string | null): string {
  return `${normalizeRole(role)}:${characterId}`;
}

export interface OwnedCharacterState {
  id: number;
  role: string;
  is_owned: boolean;
}

export interface CharacterOwnershipUpdate {
  character_id: number;
  role: string;
  is_owned: boolean;
}

/** Ownership as the character grid reads it: keyed by role and id, never id alone. */
export function buildCharacterOwnershipDraft(rows: OwnedCharacterState[]): Record<string, boolean> {
  const draft: Record<string, boolean> = {};
  rows.forEach((row) => {
    draft[ownershipKey(row.id, row.role)] = row.is_owned;
  });
  return draft;
}

/** The characters whose draft state differs from `loaded`; a key `loaded` lacks counts as owned. */
export function changedCharacterUpdates(
  loaded: Record<string, boolean>,
  draft: Record<string, boolean>,
): CharacterOwnershipUpdate[] {
  return Object.entries(draft)
    .filter(([key, isOwned]) => isOwned !== (loaded[key] ?? true))
    .map(([key, isOwned]) => {
      const [role, id] = key.split(':');
      return { character_id: Number(id), role, is_owned: isOwned };
    });
}

/** `"Killer"`, `"killers"`, `"KILLER"` all become `"killer"`. */
export function normalizeRole(role?: string | null): string {
  return (role ?? '').trim().toLowerCase().replace(/s$/, '') === 'killer' ? 'killer' : 'survivor';
}

/**
 * Whether a perk is taught by this character.
 *
 * The API still returns `character_id`, but it is scoped to the perk's own
 * role now, so comparing it to a bare character id would match a survivor's
 * perk against the killer who happens to share that number. The perk carries
 * `survivor_id` and `killer_id` for exactly this reason.
 */
export function ownsPerk(
  perk: { survivor_id?: number | null; killer_id?: number | null },
  characterId: number,
  role?: string | null,
): boolean {
  return normalizeRole(role) === 'killer'
    ? perk.killer_id === characterId
    : perk.survivor_id === characterId;
}
