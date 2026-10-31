'use client';
// frontend/src/components/perks/PerkSortMenu.tsx
//
// The sort menu of the Perks header: perks are ordered by name, A to Z or Z to A.
import React from 'react';
import { ArrowDownUp } from 'lucide-react';
import { CustomDropdown, type DropdownOption } from '@/components/common/CustomDropdown';
import { useDictionary } from '@/context/DictionaryContext';
import type { SortOrder } from '@/types/perks';

const SORT_ORDERS: readonly SortOrder[] = ['asc', 'desc'];

interface PerkSortMenuProps {
  order: SortOrder;
  setOrder: (order: SortOrder) => void;
  buttonClassName?: string;
}

export const PerkSortMenu: React.FC<PerkSortMenuProps> = ({ order, setOrder, buttonClassName }) => {
  const dict = useDictionary();

  const sortLabel = (direction: SortOrder) =>
    `${dict.filters.sortByName} ${direction === 'asc' ? dict.filters.orderAsc : dict.filters.orderDesc}`;
  const options: DropdownOption<SortOrder>[] = SORT_ORDERS.map((direction) => ({ value: direction, label: sortLabel(direction) }));

  return (
    <CustomDropdown<SortOrder>
      options={options}
      value={order}
      onChange={setOrder}
      icon={<ArrowDownUp className="icon-sm" />}
      label={sortLabel(order)}
      ariaLabel={dict.filters.sortBy}
      accent="primary"
      align="right"
      minWidthClass="min-w-44"
      buttonClassName={buttonClassName}
    />
  );
};
