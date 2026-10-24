// frontend/src/components/perks/roleOnlyMessage.ts
import type { Dictionary } from '@/locales/types';
import type { RoleCategory } from '@/types/perks';
import type { PerkType } from '@/utils/perkTypes';
import { formatMessage } from '@/utils/i18nFormat';

/** The role's plural name, as on the role toggle ("Survivors"). */
export const roleLabel = (role: RoleCategory, dict: Dictionary): string =>
  role === 'Killer' ? dict.filters.killer : dict.filters.survivor;

/** "Exhaustion perks only exist for Survivors." */
export function roleOnlyMessage(conflict: { type: PerkType; role: RoleCategory }, dict: Dictionary, locale: string): string {
  return formatMessage(
    dict.perkTypes.roleOnlyTitle,
    { type: dict.perkTypes.labels[conflict.type], role: roleLabel(conflict.role, dict) },
    locale
  );
}
