'use client';
// frontend/src/components/common/Table.tsx
// The one data table (rows of records with column headings: users, audit log, a scoreboard). Not for
// game boards or layout grids. Compose it:
//
//   <Table>
//     <TableHead><tr><Th>Name</Th><Th className="hidden lg:table-cell">Joined</Th></tr></TableHead>
//     <TableBody>{rows.map((r) => <TableRow key={r.id}><Td>{r.name}</Td><Td>{r.joined}</Td></TableRow>)}</TableBody>
//   </Table>
//
// Table scrolls sideways on its own when the columns do not fit. `framed` draws the border around it
// (a table inside a modal); inside a Surface leave it off. `density` sets the cell padding for every
// cell in the table.
import React, { createContext, useContext } from 'react';
import { cn } from '@/utils/cn';

export type TableDensity = 'sm' | 'md';

const CELL_PADDING: Record<TableDensity, string> = {
  sm: 'px-3 py-2',
  md: 'px-4 py-2.5',
};

const DensityContext = createContext<TableDensity>('md');

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  density?: TableDensity;
  framed?: boolean;
  /** Class for the scroll wrapper (visibility, opacity while loading). */
  wrapperClassName?: string;
  wrapperProps?: Omit<React.HTMLAttributes<HTMLDivElement>, 'className'>;
}

export function Table({ density = 'md', framed = false, wrapperClassName, wrapperProps, className, children, ...rest }: TableProps) {
  return (
    <DensityContext.Provider value={density}>
      <div className={cn('overflow-x-auto', framed && 'rounded-card border border-border-color', wrapperClassName)} {...wrapperProps}>
        <table className={cn('w-full text-left type-body text-text-primary', className)} {...rest}>
          {children}
        </table>
      </div>
    </DensityContext.Provider>
  );
}

export function TableHead({ className, ...rest }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-border-color bg-bg-elevated/60 type-label-2xs text-text-secondary', className)} {...rest} />;
}

export function TableBody({ className, ...rest }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-border-subtle', className)} {...rest} />;
}

export function TableRow({ className, ...rest }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('transition-colors hover:bg-bg-elevated/40', className)} {...rest} />;
}

/** A column heading. */
export function Th({ className, scope = 'col', ...rest }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope={scope} className={cn(CELL_PADDING[useContext(DensityContext)], className)} {...rest} />;
}

export function Td({ className, ...rest }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn(CELL_PADDING[useContext(DensityContext)], className)} {...rest} />;
}
