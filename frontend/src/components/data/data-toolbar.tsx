import type { ReactNode } from 'react';
import { Input } from '../ui';

export function DataToolbar({ searchLabel = 'Search', searchValue, onSearchChange, filters, actions }: { searchLabel?: string; searchValue?: string; onSearchChange?: (value: string) => void; filters?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {onSearchChange ? (
          <Input aria-label={searchLabel} placeholder={searchLabel} value={searchValue ?? ''} onChange={(event) => onSearchChange(event.target.value)} className="max-w-sm" />
        ) : null}
        {filters}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
