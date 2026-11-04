'use client';
// frontend/src/components/smash-or-pass/hub/HubFilterDrawer.tsx
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDictionary } from '@/context/DictionaryContext';
import { isKiller as isKillerRole, isSurvivor as isSurvivorRole } from '@/utils/characterUtils';
import { genderLabel, termLabel } from '@/utils/smashOrPass/terms';
import { SegmentedControl } from '@/components/common/SegmentedControl';

interface HubFilterDrawerProps {
  isOpen: boolean;
  roleFilter: string;
  genderFilter: string;
  availableRoles: string[];
  availableGenders: string[];
  onFilterChange: (type: 'role' | 'gender', value: string) => void;
  onClose?: () => void;
}

/** Every gender option lights up the same pink: no green/red here, which would read as survivor/killer. */
const GENDER_ACTIVE = 'bg-accent-red text-text-inverted';
const GENDER_ACTIVE_TEXT = 'text-text-inverted';

/** The role and gender segmented switches that expand under the command dock. */
export function HubFilterDrawer({
  isOpen,
  roleFilter,
  genderFilter,
  availableRoles,
  availableGenders,
  onFilterChange,
  onClose,
}: HubFilterDrawerProps) {
  const dict = useDictionary();
  const filters = dict.smashOrPass.filters;

  useEffect(() => {
    if (!isOpen || !onClose) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="smash-filter-drawer"
          initial={{ opacity: 0, y: -6, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.99 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-full left-0 right-0 mt-2 z-40 p-2.5 sm:p-3 rounded-card bg-bg-surface/95 border border-border-color backdrop-blur-2xl shadow-2xl"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3">
            {/* Role Segmented Switch */}
            <SegmentedControl<string>
              ariaLabel={filters.allRoles}
              size="sm"
              value={roleFilter}
              onChange={(role) => onFilterChange('role', role)}
              className="w-full md:w-auto"
              options={[
                { value: 'all', label: filters.allRoles },
                ...availableRoles.map((role) => {
                  const isSurvivor = isSurvivorRole(role);
                  const isKiller = isKillerRole(role);
                  return {
                    value: role,
                    label: isSurvivor ? filters.survivors : isKiller ? filters.killers : termLabel(role),
                    activeClassName: isSurvivor ? 'bg-accent-green text-text-inverted' : 'bg-accent-red text-text-inverted',
                  };
                }),
              ]}
            />

            {/* Gender Segmented Switch */}
            <SegmentedControl<string>
              ariaLabel={filters.allGenders}
              size="sm"
              value={genderFilter}
              onChange={(gender) => onFilterChange('gender', gender)}
              className="w-full md:w-auto"
              options={[
                { value: 'all', label: filters.allGenders, activeClassName: GENDER_ACTIVE, activeTextColor: GENDER_ACTIVE_TEXT },
                ...availableGenders.map((gender) => ({
                  value: gender,
                  label: genderLabel(gender, filters),
                  activeClassName: GENDER_ACTIVE,
                  activeTextColor: GENDER_ACTIVE_TEXT,
                })),
              ]}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
