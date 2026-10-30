'use client';
// frontend/src/components/perks/PerkSortMenu.tsx
//
// The sort menu of the Perks header: field and direction as one list (Name A-Z, Name Z-A, ...).
import React from 'react';
import { ArrowDownUp } from 'lucide-react';
import { CustomDropdown, type DropdownOption } from '@/components/common/CustomDropdown';
import { useDictionary } from '@/context/DictionaryContext';
import type { SortField, SortOrder } from '@/types/perks';

type SortChoice = `${SortField}:${SortOrder}`;

const SORT_CHOICES: readonly SortChoice[] = ['name:asc', 'name:desc', 'character:asc', 'character:desc'];

interface PerkSortMenuProps {
  sortBy: SortField;
  setSortBy: (field: SortField) => void;
  order: SortOrder;
  setOrder: (order: SortOrder) => void;
  buttonClassName?: string;
}

export const PerkSortMenu: React.FC<PerkSortMenuProps> = ({ sortBy, setSortBy, order, setOrder, buttonClassName }) => {
  const dict = useDictionary();

  const sortLabel = (choice: SortChoice) => {
    const [field, direction] = choice.split(':') as [SortField, SortOrder];
    return `${field === 'name' ? dict.filters.sortByName : dict.filters.sortByCharacter} ${direction === 'asc' ? dict.filters.orderAsc : dict.filters.orderDesc}`;
  };
  const options: DropdownOption<SortChoice>[] = SORT_CHOICES.map((choice) => ({ value: choice, label: sortLabel(choice) }));
  const current: SortChoice = `${sortBy}:${order}`;

  return (
    <CustomDropdown<SortChoice>
      options={options}
      value={current}
      onChange={(choice) => {
        const [field, direction] = choice.split(':') as [SortField, SortOrder];
        setSortBy(field);
        setOrder(direction);
      }}
      icon={<ArrowDownUp className="icon-sm" />}
      label={sortLabel(current)}
      ariaLabel={dict.filters.sortBy}
      accent="primary"
      align="right"
      minWidthClass="min-w-44"
      buttonClassName={buttonClassName}
    />
  );
};
