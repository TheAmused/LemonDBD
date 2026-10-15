// frontend/src/utils/smashOrPass/exportDoc.ts
import type { StoredCustomRoster } from '@/types/smashOrPass';

/** A stored roster without its storage-only fields: the document that is exported, shared and reported. */
export function smashRosterExportDoc(roster: StoredCustomRoster) {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...doc } = roster;
  return doc;
}
