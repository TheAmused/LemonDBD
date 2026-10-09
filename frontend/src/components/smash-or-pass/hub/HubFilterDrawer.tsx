'use client';
// frontend/src/components/smash-or-pass/hub/HubFilterDrawer.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import { isKiller as isKillerRole, isSurvivor as isSurvivorRole } from '@/utils/characterUtils';

interface HubFilterDrawerProps {
  isOpen: boolean;
  roleFilter: string;
  genderFilter: string;
  availableRoles: string[];
  availableGenders: string[];
  onFilterChange: (type: 'role' | 'gender', value: string) => void;
}

/** The role and gender segmented switches that expand under the command dock. */
export function HubFilterDrawer({
  isOpen,
  roleFilter,
  genderFilter,
  availableRoles,
  availableGenders,
  onFilterChange,
}: HubFilterDrawerProps) {
  const dict = useDictionary();
  const filters = dict.smashOrPass.filters;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="smash-filter-drawer"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden border-t border-border-color pt-3"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Role Segmented Switch */}
            <div className="flex items-center gap-1 p-1 bg-bg-elevated border border-border-color rounded-2xl w-full md:w-auto shadow-inner type-strong overflow-x-auto">
              <button
                type="button"
                onClick={() => onFilterChange('role', 'all')}
                className={`flex-1 md:flex-none min-h-[44px] sm:min-h-[36px] flex items-center justify-center px-3.5 py-1.5 rounded-xl transition-all cursor-pointer touch-manipulation whitespace-nowrap ${
                  roleFilter === 'all' ? 'bg-accent-red text-text-inverted' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {filters.allRoles}
              </button>
              {availableRoles.map((role) => {
                const isSurvivor = isSurvivorRole(role);
                const isKiller = isKillerRole(role);
                const label = isSurvivor ? filters.survivors : isKiller ? filters.killers : role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => onFilterChange('role', role)}
                    className={`flex-1 md:flex-none min-h-[44px] sm:min-h-[36px] flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer touch-manipulation whitespace-nowrap ${
                      roleFilter === role
                        ? isSurvivor
                          ? 'bg-accent-green text-text-inverted font-black'
                          : 'bg-accent-red text-text-inverted'
                        : isSurvivor
                          ? 'text-text-muted hover:text-accent-green'
                          : 'text-text-muted hover:text-accent-red'
                    }`}
                  >
                    {isSurvivor && <SurvivorIcon className="h-3.5 w-3.5" />}
                    {isKiller && <KillerIcon className="h-3.5 w-3.5" />}
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Gender Segmented Switch */}
            <div className="flex items-center gap-1 p-1 bg-bg-elevated border border-border-color rounded-2xl w-full md:w-auto shadow-inner type-strong overflow-x-auto">
              <button
                type="button"
                onClick={() => onFilterChange('gender', 'all')}
                className={`min-h-[44px] sm:min-h-[36px] flex items-center justify-center px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer touch-manipulation whitespace-nowrap ${
                  genderFilter === 'all' ? 'bg-accent-red text-text-inverted' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {filters.allGenders}
              </button>
              {availableGenders.map((gender) => {
                const isFemale = gender === 'female';
                const isMale = gender === 'male';
                const isMonster = gender === 'monster_other';
                const label = isFemale
                  ? filters.femaleOnly
                  : isMale
                    ? filters.maleOnly
                    : isMonster
                      ? filters.monsters
                      : gender;
                return (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => onFilterChange('gender', gender)}
                    className={`min-h-[44px] sm:min-h-[36px] flex items-center justify-center px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer touch-manipulation whitespace-nowrap ${
                      genderFilter === gender
                        ? isFemale
                          ? 'bg-accent-red text-text-inverted'
                          : isMale
                            ? 'bg-accent-green text-text-inverted'
                            : 'bg-border-subtle text-text-primary'
                        : isFemale
                          ? 'text-text-muted hover:text-accent-red'
                          : isMale
                            ? 'text-text-muted hover:text-accent-green'
                            : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
