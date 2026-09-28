// frontend/src/components/tier-lists/dndIds.ts
/**
 * dnd-kit wants one id space for every draggable and droppable on the board,
 * but item keys and tier ids are independent user data -- a custom item may
 * be called "s", the same as the S tier. Prefixing keeps them apart.
 */
const ITEM_PREFIX = 'item|';
const CONTAINER_PREFIX = 'zone|';

export const itemDndId = (key: string): string => `${ITEM_PREFIX}${key}`;
export const containerDndId = (id: string): string => `${CONTAINER_PREFIX}${id}`;

export function parseItemDndId(id: string | number | null | undefined): string | null {
  const s = String(id ?? '');
  return s.startsWith(ITEM_PREFIX) ? s.slice(ITEM_PREFIX.length) : null;
}

export function parseContainerDndId(id: string | number | null | undefined): string | null {
  const s = String(id ?? '');
  return s.startsWith(CONTAINER_PREFIX) ? s.slice(CONTAINER_PREFIX.length) : null;
}
